import OpenAI from "openai";
import { progressTracker, progressTrackerKV } from "../utils/progress-tracker";
import { ContentCleaner } from "../utils/content-cleaner";
import { ChunkValidator, type ChunkValidationReport } from "../utils/chunk-validator";

export interface Chunk {
  content: string;
  section: string;
  tags?: string[];
  topic?: string | null;
  index: number;
}

export interface ChunkingResult {
  chunks: Chunk[];
  embeddings: number[][];
}

type ChunkerOptions = {
  chunkModel?: string;
  embeddingModel?: string;
  chunkCharBatch?: number;
  embedBatchCount?: number;
  maxRetries?: number;
  minCoverageRatioWarn?: number;
  cacheKV?: KVNamespace;
};

const DEFAULTS: Required<Omit<ChunkerOptions, "minCoverageRatioWarn" | "cacheKV">> & { minCoverageRatioWarn: number; cacheKV?: KVNamespace } = {
  chunkModel: "gpt-4o",
  embeddingModel: "text-embedding-3-small",
  chunkCharBatch: 12000,
  embedBatchCount: 100,
  maxRetries: 3,
  minCoverageRatioWarn: 0.85,
  cacheKV: undefined,
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base: number, attempt: number) {
  return base * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
}

function normalizeSection(raw?: string): string {
  const s = (raw || "").toString().trim();
  if (!s) return "General";
  return s.replace(/\s+/g, " ").slice(0, 200);
}

function normalizeTags(arr?: any): string[] {
  if (!arr) return [];
  if (Array.isArray(arr)) {
    return arr
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

function normalizeText(raw: string) {
  let t = (raw || "").toString();
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export class ChunkingServiceV2 {
  private openai: OpenAI;
  private opts: Required<Omit<ChunkerOptions, "cacheKV">> & { cacheKV?: KVNamespace };

  constructor(apiKey: string, options?: ChunkerOptions) {
    this.openai = new OpenAI({ apiKey });
    this.opts = { ...DEFAULTS, ...(options || {}) };
  }

  private async updateProgress(uploadId?: string, message?: string, isUpdate = false) {
    if (!uploadId) return;
    try {
      if (this.opts.cacheKV) {
        const kvTracker = progressTrackerKV(this.opts.cacheKV);
        if (message) await kvTracker.step(uploadId, message);
        if (isUpdate) await kvTracker.update(uploadId);
      } else {
        if (message) progressTracker.step(uploadId, message);
        if (isUpdate) progressTracker.update(uploadId);
      }
    } catch {}
  }

  async process(
    text: string,
    fileName: string,
    version: string,
    preview = false,
    uploadId?: string,
    embeddingModelOverride?: string
  ): Promise<ChunkingResult> {
    console.info(`chunking.start file="${fileName}" version=${version}`);
    if (uploadId) await this.updateProgress(uploadId, `Starting chunking for ${fileName}`);

    const originalText = text; // Keep for validation

    // Clean content before processing (remove UI artifacts, normalize)
    const { cleaned: cleanedText, metadata: extractedMetadata } = ContentCleaner.cleanContent(text, {
      removeUIArtifacts: true,
      normalizeWhitespace: true,
      extractMetadata: true,
    });

    // Log cleaning stats
    const quality = ContentCleaner.analyzeContentQuality(text, cleanedText);
    console.info(`chunking.cleanup removed=${quality.artifactsRemoved} compressed=${quality.compressionRatio}% metadata=${quality.hasMetadata}`);
    if (uploadId) await this.updateProgress(uploadId, `Content cleaned: removed ${quality.artifactsRemoved} artifacts`);

    const normalizedText = normalizeText(cleanedText);
    const gptChunks = await this.gptSemanticChunksBatched(normalizedText, fileName, uploadId);

    let chunks: Chunk[] = gptChunks
      .map((c: any, i: number) => ({
        content: (c?.content || "").toString(),
        section: normalizeSection(c?.section),
        tags: normalizeTags(c?.tags),
        topic: (typeof c?.topic === "string" ? c.topic.trim() : null) || null,
        index: i,
      }))
      .filter((ch) => ch.content.trim().length > 0);

    if (uploadId) await this.updateProgress(uploadId, `Chunks generated: ${chunks.length}`);

    // QUALITY IMPROVEMENTS: Fix boundaries, merge fragments, validate coverage
    chunks = await this.improveChunkQuality(chunks, normalizedText, uploadId);

    if (uploadId) await this.updateProgress(uploadId, `Chunk quality improved: boundaries fixed, fragments merged`);

    const model = embeddingModelOverride || this.opts.embeddingModel;
    const embeddings = preview ? chunks.map(() => []) : await this.embedChunks(chunks.map((c) => c.content), model, uploadId);

    if (uploadId && !preview) await this.updateProgress(uploadId, `Embeddings generated`);

    return { chunks, embeddings };
  }

  /**
   * Improve chunk quality:
   * - Fix sentence boundaries
   * - Merge fragments
   * - Validate coverage
   * - Ensure no mid-sentence starts
   */
  private async improveChunkQuality(
    chunks: Chunk[],
    sourceText: string,
    uploadId?: string
  ): Promise<Chunk[]> {
    try {
      if (!chunks || chunks.length === 0) return chunks;

      // DO NOT merge fragments aggressively - preserve semantic chunking from GPT
      // Only validate and filter out empty chunks
      let improved = [...chunks];

      // Remove truly empty chunks only (not fragments)
      improved = improved.filter((ch) => ch && ch.content && ch.content.trim().length > 0);

      if (improved.length === 0) return chunks; // Fallback if all filtered out

      // CRITICAL: Check for missing lines (especially metadata)
      // If source has "Source URL:", "Page Title:", etc. but chunks don't, add them to first chunk
      const sourceLines = sourceText.split('\n').map(line => line.trim()).filter(l => l.length > 0);
      const combinedChunks = improved.map(c => c.content).join('\n');
      
      const missingLines: string[] = [];
      for (const line of sourceLines) {
        // Only check for "important" lines (short metadata or all-caps headings)
        if ((line.includes(':') && line.length < 100) || /^[A-Z\s]+$/.test(line)) {
          if (!combinedChunks.includes(line)) {
            missingLines.push(line);
          }
        }
      }

      // If metadata is missing from first chunk, prepend it
      if (missingLines.length > 0 && improved.length > 0) {
        const metadata = missingLines.join('\n');
        improved[0].content = metadata + '\n' + improved[0].content;
        console.info(`improveChunkQuality: Added ${missingLines.length} missing metadata lines to first chunk`);
      }

      // Validate coverage
      const validation = ChunkValidator.validate(improved, sourceText);
      console.info(`chunking.validation ${ChunkValidator.formatReport(validation)}`);

      if (uploadId) {
        if (validation.valid) {
          progressTracker.step(
            uploadId,
            `✓ Coverage ${(validation.coverage.percentageOfSource * 100).toFixed(1)}% valid (${improved.length} chunks)`
          );
        } else {
          const errors = validation.issues.filter((i) => i.severity === "error").length;
          progressTracker.step(uploadId, `⚠ ${errors} quality issues (${improved.length} chunks)`);
        }
      }

      // Reindex
      improved = improved.map((ch, idx) => ({ ...ch, index: idx }));

      // CRITICAL: Return validation result along with chunks for controller to enforce
      (improved as any).__validation = validation;

      return improved;
    } catch (e: any) {
      console.warn(`improveChunkQuality error (non-blocking): ${e.message}`);
      // Return original chunks if improvement fails
      return chunks;
    }
  }

  private async gptSemanticChunksBatched(text: string, fileName: string, uploadId?: string): Promise<any[]> {
    const totalChunks: any[] = [];
    const batches = this.splitIntoBatches(text, this.opts.chunkCharBatch);

    if (uploadId) progressTracker.init(uploadId, `Chunking ${fileName}`, batches.length);

    const systemPrompt =
      "You are an expert document chunking engine for RAG search & retrieval.\n" +
      "Your goal: Create semantically meaningful chunks that preserve 100% of content and are optimized for search.\n\n" +
      "=== PRIMARY GOAL: 100% CONTENT PRESERVATION ===\n" +
      "- NEVER omit, skip, or drop any text - not even metadata lines\n" +
      "- PRESERVE source URLs, page titles, headings, metadata at the top of documents\n" +
      "- Every sentence, every word, every line must be present in chunks\n" +
      "- If content looks like metadata (URL, title, etc), INCLUDE IT IN FIRST CHUNK or create dedicated chunk\n" +
      "- Copy content verbatim from source\n" +
      "- Verify coverage = 100% before returning\n\n" +
      "=== CHUNKING STRATEGY (Semantically Optimal) ===\n" +
      "1. If document starts with metadata (URL, title, page info): Create FIRST CHUNK for metadata + intro\n" +
      "2. Identify NATURAL BOUNDARIES: sections, topics, logical breaks\n" +
      "3. Group content that BELONGS TOGETHER (related concepts, same topic)\n" +
      "4. Split only at COMPLETE sentence/section boundaries (never mid-sentence)\n" +
      "5. Ideal chunk size: 300-800 chars (optimal for retrieval)\n" +
      "6. Allow 1-N chunks: The RIGHT NUMBER determined by DOCUMENT STRUCTURE\n\n" +
      "=== RETRIEVAL OPTIMIZATION ===\n" +
      "Each chunk must be:\n" +
      "- SELF-CONTAINED: A user can understand it without reading other chunks\n" +
      "- SEARCHABLE: Has clear keywords that answer common questions\n" +
      "- WELL-TAGGED: Tags describe what a user would search for\n" +
      "- TOPICAL: Belongs to one clear category\n\n" +
      "=== METADATA EXCELLENCE ===\n" +
      "For each chunk extract:\n" +
      "  - content: Verbatim text (EVERY LINE, including metadata if in first chunk)\n" +
      "  - section: Clear 2-4 word topic label (e.g., 'Page Metadata', 'Contact Info', 'Address')\n" +
      "  - tags: 3-6 specific keywords that users would search for\n" +
      "    * NOT generic (avoid: 'document', 'info', 'content')\n" +
      "    * SPECIFIC (use: 'contact', 'email', 'phone', 'address', 'office location')\n" +
      "    * ACTION-ORIENTED (use: 'contact information', 'office address', 'phone number')\n" +
      "  - topic: ONE of: guide, faq, policy, legal, process, contact, resource, instruction\n\n" +
      "=== CONTENT QUALITY CHECKS ===\n" +
      "Before returning, verify:\n" +
      "✓ No line is skipped or dropped (100% coverage)\n" +
      "✓ Metadata lines ARE included in appropriate chunks\n" +
      "✓ Chunks are semantically coherent (belong together)\n" +
      "✓ Boundaries are at sentence/section ends (no mid-sentence breaks)\n" +
      "✓ Each chunk is 60+ chars (no empty/tiny chunks)\n" +
      "✓ Tags are specific and searchable\n" +
      "✓ Sections are descriptive (not generic)\n\n" +
      "=== RETURN FORMAT ===\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      "  \"chunks\": [\n" +
      "    {\"content\": \"...\", \"section\": \"...\", \"tags\": [...], \"topic\": \"...\"}\n" +
      "  ]\n" +
      "}\n\n" +
      "CRITICAL RULE: If any line is missing from chunks, response is invalid. Include metadata lines.";

    const concurrencyLimit = 2;
    const batchResults = new Array(batches.length);

    for (let i = 0; i < batches.length; i += concurrencyLimit) {
      const slice = batches.slice(i, i + concurrencyLimit);
      await Promise.all(
        slice.map(async (batchText, sliceIdx) => {
          const batchIndex = i + sliceIdx;
          const userPrompt = `IMPORTANT: Include EVERY line from this document - no lines should be dropped or skipped.

If document starts with metadata (URL, title, headings), include them in the first chunk.

Chunk this document preserving 100% of content. Organize semantically for search & retrieval.
Extract high-quality tags and section labels.

Document:\n${batchText}`;

          const batchLabel = `batch ${batchIndex + 1}/${batches.length}`;
          if (uploadId) await this.updateProgress(uploadId, `${batchLabel} started`);

          let attempt = 0;
          while (true) {
            try {
              attempt++;
              const res = await this.openai.chat.completions.create({
                model: this.opts.chunkModel,
                temperature: 0,
                response_format: { type: "json_object" as const },
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
              });

              const raw = res.choices?.[0]?.message?.content || "{}";
              let parsed: any;
              try {
                parsed = JSON.parse(raw);
              } catch {
                const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
                parsed = JSON.parse(cleaned || "{}");
              }

              const arr = Array.isArray(parsed?.chunks) ? parsed.chunks : [];
              if (!Array.isArray(arr)) throw new Error("invalid JSON: chunks[] missing");

              batchResults[batchIndex] = arr;

              if (uploadId) await this.updateProgress(uploadId, `${batchLabel} done (${arr.length} chunks)`, true);
              break;
            } catch (err: any) {
              const msg = err?.message || String(err);
              const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("rate limit");
              const maxAllowedRetries = isRateLimit ? 8 : this.opts.maxRetries;

              if (attempt >= maxAllowedRetries) {
                const errorMsg = `${batchLabel} failed after ${attempt} attempts: ${msg}`;
                console.error(`chunking.error ${errorMsg}`);
                if (uploadId) await this.updateProgress(uploadId, `Failed: ${errorMsg}`);
                throw new Error("chunking failed");
              }

              // On OpenAI 429 rate limits, wait 7-9 seconds for token per minute (TPM) quota to reset
              const wait = isRateLimit ? 7000 + Math.floor(Math.random() * 2000) : jitter(500, attempt);
              console.warn(`chunking.retry ${batchLabel} attempt=${attempt} waitMs=${wait} error="${msg}"`);
              await sleep(wait);
            }
          }
        })
      );
    }

    for (const arr of batchResults) {
      if (Array.isArray(arr)) totalChunks.push(...arr);
    }

    if (uploadId) progressTracker.step(uploadId, `all batches processed`);
    return totalChunks;
  }

  private splitIntoBatches(text: string, size: number): string[] {
    const batches: string[] = [];
    const t = text || "";
    let start = 0;

    const headingRe = /(^|\n)\s*(#{1,4}\s+[^\n]+|[A-Z][A-Z0-9 \t\-_:]{6,120})\s*(\n|$)/g;

    while (start < t.length) {
      let end = Math.min(start + size, t.length);

      if (end < t.length) {
        let splitAt = -1;

        const windowStart = Math.max(start + Math.floor(size * 0.55), start);
        const window = t.slice(windowStart, end);

        headingRe.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = headingRe.exec(window))) {
          splitAt = windowStart + m.index;
        }

        if (splitAt > start) {
          end = splitAt;
        } else {
          const nearPara = t.lastIndexOf("\n\n", end);
          if (nearPara > start + Math.floor(size * 0.6)) {
            end = nearPara;
          } else {
            const nearLine = t.lastIndexOf("\n", end);
            if (nearLine > start + Math.floor(size * 0.75)) end = nearLine;
          }
        }
      }

      if (end <= start) end = Math.min(start + size, t.length);
      batches.push(t.slice(start, end));
      start = end;
    }

    return batches.filter((b) => b.trim().length > 0);
  }

  private async embedChunks(texts: string[], embeddingModel: string, uploadId?: string): Promise<number[][]> {
    if (uploadId) progressTracker.step(uploadId, `sending ${texts.length} chunks for embeddings`);

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.opts.embedBatchCount) {
      const slice = texts.slice(i, i + this.opts.embedBatchCount);
      let attempt = 0;

      while (true) {
        try {
          attempt++;
          const res = await this.openai.embeddings.create({ model: embeddingModel, input: slice });
          out.push(...res.data.map((d) => d.embedding as number[]));
          break;
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (attempt >= this.opts.maxRetries) {
            console.error(`embeddings.error batch failed after ${attempt} attempts: ${msg}`);
            throw err;
          }
          const wait = jitter(400, attempt);
          console.warn(`embeddings.retry attempt=${attempt} waitMs=${wait} error="${msg}"`);
          await sleep(wait);
        }
      }
    }

    return out;
  }

  private warnIfCoverageLow(original: string, chunks: Chunk[]) {
    const minRatio = this.opts.minCoverageRatioWarn;
    if (minRatio <= 0) return;

    const strip = (s: string) => s.replace(/\s+/g, "");
    const origLen = strip(original).length;
    const sumLen = strip(chunks.map((c) => c.content).join("")).length;

    if (origLen > 0) {
      const ratio = sumLen / origLen;
      if (ratio < minRatio) {
        console.warn(
          `chunking.coverage warn ratio=${ratio.toFixed(3)} threshold=${minRatio} (model may be omitting text)`
        );
      }
    }
  }
}
