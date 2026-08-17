import type { Context } from "hono";
import { fileDb } from "../services/db/files.db";
import { chunkDb } from "../services/db/chunk.db";
import { ingestDb } from "../services/db/ingest.db";
import { vectorService } from "../services/vector.service";
import { ChunkingServiceV2 } from "../services/chunkingv2.service";
import { EmbeddingService } from "../services/embedding.service";
import { LangChainChunkingService } from "../services/langChain.service";
import { progressTrackerKV } from "../utils/progress-tracker";
import { getOpenAIKey } from "../utils/keys";
import { FileStorageService } from "../services/fileStorage.service";
import { ChunkEnricher } from "../utils/chunk-enricher";
import { MetadataExtractor } from "../utils/metadata-extractor";
import { ChunkValidator } from "../utils/chunk-validator";
import { ContentCleaner } from "../utils/content-cleaner";
import { ScalableRagClient } from "../services/ingestion/scalable-rag.client";
import { purgeAllQueryCache } from "../services/cache.service";
import { INGEST_CONFIG } from "../constants";
import { sleep, backoff } from "../utils/retry";

const BATCH_SIZE = INGEST_CONFIG.DEFAULT_VECTOR_UPSERT_BATCH_SIZE;

const SECTION_RE =
  /\b(?:NAC|NRS)?\s*624\.\d{1,5}(?:\([^)]+\))?(?:\s*[–-]\s*624\.\d{1,5})?\b/i;

const extractSectionNumber = (s?: string | null) => {
  if (!s) return null;
  const m = s.match(SECTION_RE);
  return m ? m[0].toUpperCase().replace(/\s+/g, " ") : null;
};

const safeLevel = (v?: string) =>
  (v || "INFO").toUpperCase() === "ERROR"
    ? "ERROR"
    : (v || "INFO").toUpperCase() === "WARN"
    ? "WARN"
    : "INFO";

/**
 * Normalize chunks to guarantee:
 * - index is a number and stable
 * - content is non-empty string
 * - tags/topic are safe
 * - section is string
 */
function normalizeChunks(chunks: any[]): Array<{
  index: number;
  content: string;
  section: string;
  tags: string[];
  topic: string;
}> {
  const out: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const x = chunks[i] || {};
    const index = Number.isFinite(x.index) ? Number(x.index) : i;
    const content = (x.content || "").toString();
    if (!content.trim()) continue;

    out.push({
      index,
      content,
      section: (x.section || "").toString(),
      tags: Array.isArray(x.tags) ? x.tags.slice(0, 8) : [],
      topic: typeof x.topic === "string" && x.topic.trim() ? x.topic : "general",
    });
  }

  // Ensure indices are unique & stable (critical for stable IDs)
  // If duplicates exist, we reindex deterministically.
  const seen = new Set<number>();
  let needsReindex = false;
  for (const ch of out) {
    if (seen.has(ch.index)) {
      needsReindex = true;
      break;
    }
    seen.add(ch.index);
  }
  if (needsReindex) {
    out.sort((a, b) => a.index - b.index);
    out.forEach((ch, idx) => (ch.index = idx));
  }

  return out;
}

/**
 * Create vectors for chunks in stable batches.
 * Returns vectors[] aligned with chunks[] order.
 */
async function embedChunksInBatches(
  chunks: Array<{ content: string }>,
  key: string,
  embeddingModel: string,
  uploadId?: string
): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    // Truncate text to max 24,000 chars (~6,000 tokens) to ensure it stays well within OpenAI's 8,192 token limit
    const batchTexts = chunks.slice(i, i + BATCH_SIZE).map((x) => String(x.content || "").slice(0, 24000));
    const out = await EmbeddingService.generate(batchTexts, key, uploadId, embeddingModel);
    vectors.push(...out);
  }

  if (vectors.length !== chunks.length) {
    throw new Error(`Embedding count mismatch: ${vectors.length} for ${chunks.length}`);
  }

  return vectors;
}


/**
 * Build Vectorize payload for a batch.
 * CRITICAL: id must match D1 chunk_id => stableChunkId(fileId, ch.index, ch.section)
 */
async function buildVectorizeBatch(args: {
  fileId: string;
  fileName: string;
  version: string;
  embeddingModel: string;
  chunkMethod: string;
  chunks: Array<{ index: number; content: string; section: string; tags: string[]; topic: string; tier?: string }>;
  vectors: number[][];
  offset: number; // offset into chunks/vectors arrays
  size: number;   // batch size
}) {
  const batchChunks = args.chunks.slice(args.offset, args.offset + args.size);

  return Promise.all(
    batchChunks.map(async (ch, relIdx) => {
      const vectorIdx = args.offset + relIdx;
      const firstSentence = (ch.content.split(/[.!?]/)[0] || "").slice(0, 200);
      const sectionNumber = extractSectionNumber(ch.section || "");
      const chunkId = await fileDb.makeStableChunkId(args.fileId, ch.index, ch.section);

      return {
        id: chunkId,
        content: ch.content,
        index: ch.index,
        topic: ch.topic,
        tags: ch.tags,
        section: ch.section,
        sectionNumber,
        firstSentence,
        values: args.vectors[vectorIdx],
        metadata: {
          chunk_id: chunkId,
          file_id: args.fileId,
          file_name: args.fileName,
          version: args.version,
          embedding_model: args.embeddingModel,
          chunk_method: args.chunkMethod,
          section_code: sectionNumber,
          section_title: ch.section || "",
          tags: ch.tags,
          topic: ch.topic || "general",
          first_sentence: firstSentence,
          tier: ch.tier || "standard",
        },
      };
    })
  );
}


export const DataController = {
  /**
   * PREVIEW ONLY:
   * - Generates chunks for uploaded file(s)
   * - Does NOT write D1 or Vectorize
   */
  getFileChunks: async (c: Context) => {
    try {
      const form = await c.req.formData();
      const files = form.getAll("files").filter((f) => f instanceof File) as File[];
      const strategy = String(form.get("strategy") || "semantic");
      const uploadId = String(form.get("uploadId") || "");
      const enrich = String(form.get("enrich") || "false").toLowerCase() === "true";
      const engineMode = String(form.get("engineMode") || "").toLowerCase();
      const pt = progressTrackerKV(c.env.CACHE);

      const key = getOpenAIKey(c.env);
      if (!key) {
        if (uploadId) await pt.fail(uploadId, "Server misconfig: missing OPENAI_API_KEY");
        return c.json({ ok: false, message: "Missing OPENAI_API_KEY" }, 500);
      }

      if (!files.length) {
        if (uploadId) await pt.fail(uploadId, "No files uploaded");
        return c.json({ ok: false, message: "No files uploaded" }, 400);
      }

      if (uploadId) await pt.init(uploadId, "Previewing file(s)", files.length);

      const results: any[] = [];
      for (const file of files) {
        if (file.size > INGEST_CONFIG.MAX_TEXT_SIZE_BYTES) {
          const error = `File ${file.name} exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
          if (uploadId) await pt.fail(uploadId, error);
          results.push({ file: file.name, error });
          continue;
        }

        const rawText = await file.text();
        const fileName = file.name;
        const version = `v${Date.now()}`;

        if (rawText.length < 50) {
          const error = "File too short to process";
          if (uploadId) await pt.fail(uploadId, error);
          results.push({ file: fileName, error });
          continue;
        }

        let chunks: any[] = [];
        let extractedFullMarkdown = "";
        const isScalableRag = ["offline", "hybrid", "ai-full"].includes(engineMode);

        if (isScalableRag) {
          // Route through Scalable RAG microservice for multi-format extraction + 3-tier chunking
          try {
            const scalableRagUrl = c.env.SCALABLE_RAG_URL || "http://127.0.0.1:8788";
            const { ScalableRagClient } = await import("../services/ingestion/scalable-rag.client");
            const client = new ScalableRagClient(scalableRagUrl);

            // Determine chunking strategy: map fervent-curie strategies to scalable-rag strategies
            const scalableStrategy = (strategy === "ai" || strategy === "agentic") ? "ai" : "adaptive";

            const isTextFile = /\.(txt|csv|md|json|log|sql|xml|yaml|yml)$/i.test(fileName);
            const effectiveEngineMode = isTextFile ? "offline" : (engineMode as any);

            if (uploadId) {
              await pt.step(
                uploadId,
                isTextFile && engineMode !== "offline"
                  ? "Text file detected: Rerouted to Free Edge extraction..."
                  : `Processing with ${engineMode} extraction engine...`
              );
            }

            const pageImages = String(form.get("pageImages") || "");

            const scalableResult = await client.processDocument(
              file,
              effectiveEngineMode,
              scalableStrategy as any,
              pageImages || undefined
            );

            extractedFullMarkdown = scalableResult.fullMarkdown || "";

            // Convert 3-tier chunks to fervent-curie preview format with tags
            chunks = ScalableRagClient.toFerventCurieChunks(scalableResult);


            if (uploadId) {
              await pt.step(uploadId, `Extracted ${scalableResult.counts.total} chunks (${scalableResult.classification.category})`);
            }
          } catch (err: any) {
            console.warn("[DataController] Scalable RAG bridge warning, using resilient fallback:", err?.message);
            try {
              const result = await new ChunkingServiceV2(key, { cacheKV: c.env.CACHE }).process(rawText, fileName, version, true, uploadId);
              chunks = result.chunks;
            } catch (fallbackErr: any) {
              const errorMsg = err.message || fallbackErr.message || "Failed to process document";
              if (uploadId) await pt.fail(uploadId, errorMsg);
              results.push({ file: fileName, error: errorMsg });
              continue;
            }
          }
        } else if (strategy === "general") {
          chunks = await new LangChainChunkingService().generateChunksOnly(rawText, fileName, uploadId);
        } else {
          const result = await new ChunkingServiceV2(key, { cacheKV: c.env.CACHE }).process(rawText, fileName, version, true, uploadId);
          chunks = result.chunks;
        }

        // Normalize chunks
        chunks = normalizeChunks(chunks);

        // IMPORTANT: Validate against cleaned text, not raw text with HTML artifacts
        // Raw text may contain extraction artifacts that aren't real content
        const { cleaned: cleanedText } = ContentCleaner.cleanContent(rawText);
        const validation = ChunkValidator.validate(chunks, cleanedText);
        if (!validation.valid) {
          console.warn(`Chunk quality issues detected: ${validation.issues.length} issues`);
          if (uploadId) {
            const errors = validation.issues.filter((i) => i.severity === "error").length;
            await pt.step(uploadId, `⚠ ${errors} quality issues (coverage: ${(validation.coverage.percentageOfSource * 100).toFixed(1)}%)`);
          }
        } else {
          if (uploadId) {
            await pt.step(uploadId, `✓ Coverage: ${(validation.coverage.percentageOfSource * 100).toFixed(1)}%`);
          }
        }

        // ENFORCE VALIDATION: Only focus on coverage (100% = no data loss)
        if (!validation.valid) {
          const coverage = validation.coverage.percentageOfSource * 100;
          console.warn(`data.preview: Coverage ${coverage.toFixed(1)}% (issues: ${validation.issues.length})`);
          
          // For now, warn but allow - GPT is the authority on chunking
          // We'll monitor coverage and improve cleaning over time
          if (uploadId) {
            await pt.step(uploadId, `⚠ Coverage ${coverage.toFixed(1)}% - monitoring for data loss`);
          }
        } else {
          if (uploadId) {
            await pt.step(uploadId, `✓ Coverage ${(validation.coverage.percentageOfSource * 100).toFixed(1)}% - 100% data preserved`);
          }
        }

        // Minimum chunk requirement: removed - GPT decides optimal chunking
        // Trust the AI to determine the right number of chunks based on content

        // Optionally enrich chunks with better metadata and tags
        if (enrich) {
          try {
            chunks = ChunkEnricher.enrichChunks(chunks);
            if (uploadId) await pt.step(uploadId, `Enriched chunks with enhanced metadata`);
          } catch (e: any) {
            console.warn(`chunk enrichment failed (non-blocking): ${e.message}`);
          }
        }

        results.push({
          file: fileName,
          version,
          preview: true,
          totalChunks: chunks.length,
          chunks,
          fullMarkdown: extractedFullMarkdown || rawText,
          uploadId,

          enriched: enrich,
          validation: {
            valid: validation.valid,
            coverage: `${(validation.coverage.percentageOfSource * 100).toFixed(1)}%`,
            issues: validation.issues.length,
          },
        });

        if (uploadId) {
          try {
            await c.env.CACHE.put(`preview:${uploadId}`, JSON.stringify(results), { expirationTtl: 86400 });
          } catch (e: any) {
            console.warn(`Failed to store preview in KV: ${e.message}`);
          }
          await pt.complete(uploadId, "Preview chunks generated successfully");
        }
      }

      return c.json({ ok: true, message: "Preview chunks generated", results });
    } catch (err: any) {
      return c.json({ ok: false, message: `Preview failed: ${err.message}` }, 500);
    }
  },

  getPreviewChunksByUploadId: async (c: Context) => {
    try {
      const uploadId = c.req.param("uploadId");
      if (!uploadId) {
        return c.json({ ok: false, message: "uploadId parameter required" }, 400);
      }

      const raw = await c.env.CACHE.get(`preview:${uploadId}`);
      if (!raw) {
        return c.json({ ok: false, message: "Preview chunks not found or expired" }, 404);
      }

      const results = JSON.parse(raw);
      return c.json({ ok: true, results });
    } catch (err: any) {
      return c.json({ ok: false, message: `Failed to retrieve preview chunks: ${err.message}` }, 500);
    }
  },

  /**
   * ADMIN INGEST (multipart):
   * - Insert file row (D1)
   * - Store original raw text to private R2 (best-effort)
   * - Chunk (semantic/general)
   * - Embed in batches
   * - Save chunks to D1 (stable IDs)
   * - Save vectors to Vectorize (same stable IDs)
   */
  adminIngestBatch: async (c: Context) => {
    const form = await c.req.formData();
    const uploadId = form.get("uploadId")?.toString() || null;
    const pt = progressTrackerKV(c.env.CACHE);

    const key = getOpenAIKey(c.env);
    if (!key) {
      if (uploadId) await pt.fail(uploadId, "Server misconfig: missing OPENAI_API_KEY");
      return c.json({ ok: false, message: "Missing OPENAI_API_KEY" }, 500);
    }

    const files = form.getAll("files").filter((f) => f instanceof File) as File[];
    if (!files.length) return c.json({ ok: false, message: "No files uploaded" }, 400);

    const chunkMethod = (form.get("chunkMethod")?.toString() as "semantic" | "general") || "semantic";
    const embeddingModel = form.get("embeddingModel")?.toString() || "text-embedding-3-small";

    const jobId = await ingestDb.startJob(c.env.DB, "admin", files.length);
    const results: any[] = [];

    try {
      for (const f of files) {
        const fileName = f.name;
        const version = `v${Date.now()}`;
        const rawText = await f.text();
        const size = rawText.length;

        // checksum for dedupe across admin-ingest path (rawText based)
        const checksum = await fileDb.contentHash(rawText);

        await ingestDb.log(c.env.DB, jobId, null, "INFO", `Preparing file ${fileName} (size=${size}, checksum=${checksum})`);

        const existing: any = await fileDb.findByChecksum(c.env.DB, checksum);
        if (existing && existing.file_status === "completed") {
          await ingestDb.log(c.env.DB, jobId, existing.file_id, "INFO", `Skip existing completed file: ${fileName}`);
          await ingestDb.incProcessed(c.env.DB, jobId);
          results.push({ file: fileName, fileId: existing.file_id, skipped: true });
          continue;
        }

        const fileId = crypto.randomUUID();

        // 1) MANDATORY: Store original to R2 FIRST to get file_path
        let r2Key: string;
        try {
          const result = await FileStorageService.putOriginalTextToPrivateR2(c, fileId, fileName, rawText);
          r2Key = result.key;
          await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Original saved to R2: ${r2Key}`);
        } catch (e: any) {
          const errorMsg = `R2 save failed: ${e.message} - file_path cannot be null`;
          await ingestDb.log(c.env.DB, jobId, fileId, "ERROR", errorMsg);
          await ingestDb.incFailed(c.env.DB, jobId);
          results.push({ file: fileName, error: errorMsg });
          continue;
        }

        // 2) Now insert file metadata WITH correct file_path
        await fileDb.insertFile(c.env.DB, {
          id: fileId,
          name: fileName,
          source: "admin",
          version,
          size_bytes: size,
          checksum,
          file_path: r2Key,
          upload_id: uploadId,
          chunk_method: chunkMethod,
          embedding_model: embeddingModel,
        });

        if (size < 50) {
          await fileDb.updateFile(c.env.DB, fileId, { file_status: "failed", error_message: "File too short" });
          await ingestDb.log(c.env.DB, jobId, fileId, "ERROR", "File too short");
          await ingestDb.incFailed(c.env.DB, jobId);
          results.push({ file: fileName, fileId, error: "File too short" });
          continue;
        }

        // 3) Chunk
        let chunksRaw: any[] = [];
        if (chunkMethod === "general") {
          chunksRaw = await new LangChainChunkingService().generateChunksOnly(rawText, fileName, uploadId || undefined);
        } else {
          const out = await new ChunkingServiceV2(key, { cacheKV: c.env.CACHE }).process(rawText, fileName, version, true, uploadId || undefined);
          chunksRaw = out.chunks;
        }
        const chunks = normalizeChunks(chunksRaw);

        // update file status
        await fileDb.updateFile(c.env.DB, fileId, { file_status: "processing", chunk_count: chunks.length });
        await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Chunks created: ${chunks.length}`);

        // progress tracker planning
        if (uploadId) {
          const embedBatches = Math.max(1, Math.ceil(chunks.length / BATCH_SIZE));
          const totalSteps = 1 + embedBatches + embedBatches; // chunks + embeds + vectors
          await pt.init(uploadId, `Ingest: ${fileName}`, totalSteps);
          await pt.step(uploadId, `Chunks ready: ${chunks.length}`);
          await pt.update(uploadId);
        }

        // 4) Embed
        const vectors = await embedChunksInBatches(chunks, key, embeddingModel, uploadId || undefined);

        // optional progress update (after embedding batches)
        if (uploadId) {
          await pt.step(uploadId, `Embeddings done: ${chunks.length}/${chunks.length}`);
          await pt.update(uploadId);
        }

        // 5) Save to D1 (stable IDs)
        await fileDb.saveChunksBatch(c.env.DB, {
          fileId,
          fileName,
          version,
          chunks,
          embeddingModel,
          chunkMethod,
          source: "admin",
        });

        // 6) Save to Vectorize in stable batches (IDs MUST match D1)
        for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
          const batch = await buildVectorizeBatch({
            fileId,
            fileName,
            version,
            embeddingModel,
            chunkMethod,
            chunks,
            vectors,
            offset,
            size: BATCH_SIZE,
          });

          let attempt = 0;
          for (;;) {
            try {
              await vectorService.storeChunks(batch, key, c.env.VECTORIZE, { embeddingModel });
              break;
            } catch (e: any) {
              attempt++;
              await ingestDb.log(c.env.DB, jobId, fileId, "WARN", `Vectorize retry ${attempt}: ${e.message}`);
              if (attempt >= 3) throw e;
              await new Promise((r) =>
                setTimeout(r, 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 200))
              );
            }
          }

          if (uploadId) {
            const done = Math.min(offset + BATCH_SIZE, chunks.length);
            await pt.step(uploadId, `Vector upload ${done}/${chunks.length}`);
            await pt.update(uploadId);
          }
        }

        await fileDb.updateFile(c.env.DB, fileId, { file_status: "completed" });
        await ingestDb.incProcessed(c.env.DB, jobId);
        await ingestDb.log(c.env.DB, jobId, fileId, "INFO", "Completed");
        if (uploadId) await pt.complete(uploadId, `Ingest completed for ${fileName}`);

        results.push({ file: fileName, fileId, chunks: chunks.length });
      }

      await ingestDb.finishJob(c.env.DB, jobId, "completed");
      return c.json({ ok: true, jobId, results });
    } catch (err: any) {
      try {
        await ingestDb.finishJob(c.env.DB, jobId, "failed", err.message);
      } catch {}
      if (uploadId) await progressTrackerKV(c.env.CACHE).fail(uploadId, `Ingest failed: ${err.message}`);
      return c.json({ ok: false, jobId, error: err.message }, 500);
    }
  },

  /**
   * FINALIZE (reviewed chunks):
   * - Inserts file row
   * - Optionally stores "rawText" to R2 (preferred)
   *   - If rawText is not provided, reconstructs from chunks (best-effort)
   * - Embeds + saves to D1 + Vectorize using stable IDs
   */
  finalizeChunks: async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const pt = progressTrackerKV(c.env.CACHE);

    try {
      const key = getOpenAIKey(c.env);
      if (!key) return c.json({ ok: false, message: "Missing OPENAI_API_KEY" }, 500);
      if (!body) return c.json({ ok: false, message: "Invalid JSON body" }, 400);

      let {
        chunks,
        fileName,
        version,
        uploadId,
        fileId,
        chunkMethod = "semantic",
        embeddingModel = "text-embedding-3-small",
        rawText, // OPTIONAL: recommended for exact download later
        enrich = true, // Auto-enrich for finalize (always use enhanced metadata)
      } = body as any;

      if (!fileName) return c.json({ ok: false, message: "fileName is required." }, 400);
      if (!fileId) fileId = crypto.randomUUID();
      if (!version) version = `v${Date.now()}`;
      if (!Array.isArray(chunks) || !chunks.length) {
        return c.json({ ok: false, message: "No valid chunks received." }, 400);
      }

      // normalize chunks and enforce stable indices
      let normalized = normalizeChunks(chunks);
      if (!normalized.length) {
        return c.json({ ok: false, message: "All chunks were empty after normalization." }, 400);
      }

      const totalSize = normalized.reduce((sum, ch) => sum + ch.content.length, 0);

      // VALIDATE chunks for quality (log metrics, but do not block user-approved finalize)
      const validation = ChunkValidator.validate(normalized, rawText || "");
      if (!validation.valid) {
        const errorCount = validation.issues.filter((i) => i.severity === "error").length;
        const coverage = validation.coverage.percentageOfSource * 100;
        console.warn(`Chunk quality check on finalize: ${errorCount} issues, coverage=${coverage.toFixed(1)}%`);
      }


      // checksum: to dedupe finalize flow, prefer rawText checksum if available (best UX)
      const checksum = rawText ? await fileDb.contentHash(String(rawText)) : await fileDb.contentHash(
        normalized.map((c) => `${c.index}|${c.section}|${c.topic}|${c.tags.join(",")}|${c.content}`).join("\n")
      );

      const jobId = await ingestDb.startJob(c.env.DB, "admin", 1);
      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Finalize-approved start for ${fileName}`);
      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Coverage: ${(validation.coverage.percentageOfSource * 100).toFixed(1)}%`);

      // Auto-enrich chunks with better metadata and tags for finalized content (after jobId exists)
      if (enrich) {
        try {
          normalized = ChunkEnricher.enrichChunks(normalized as any, rawText);
          await ingestDb.log(c.env.DB, jobId, fileId, "INFO", "Chunks enriched with enhanced metadata");
        } catch (e: any) {
          console.warn(`chunk enrichment failed (non-blocking): ${e.message}`);
          await ingestDb.log(c.env.DB, jobId, fileId, "WARN", `Enrichment failed: ${e.message}`);
        }
      }

      const existing: any = await fileDb.findByChecksum(c.env.DB, checksum);
      if (existing && existing.file_status === "completed") {
        await ingestDb.log(c.env.DB, jobId, existing.file_id, "INFO", `Skip existing completed finalize: ${fileName}`);
        await ingestDb.incProcessed(c.env.DB, jobId);
        await ingestDb.finishJob(c.env.DB, jobId, "completed");
        if (uploadId) await pt.complete(uploadId, "Already stored (skipped)");
        return c.json({
          ok: true,
          jobId,
          results: [{ file: fileName, fileId: existing.file_id, skipped: true, chunks: existing.chunk_count ?? null }],
        });
      }

      // R2 store MANDATORY - must succeed before DB insert
      let filePath: string;
      try {
        const textToStore =
          typeof rawText === "string" && rawText.trim().length > 0
            ? rawText
            : normalized.map((c) => c.content).join("\n\n");

        const { key: r2Key } = await FileStorageService.putOriginalTextToPrivateR2(
          c,
          fileId,
          fileName,
          textToStore
        );

        filePath = r2Key;
        await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Finalize: original stored to R2: ${r2Key}`);
      } catch (e: any) {
        const errorMsg = `R2 save failed: ${e.message} - cannot proceed without file_path`;
        await ingestDb.log(c.env.DB, jobId, fileId, "ERROR", errorMsg);
        await ingestDb.incFailed(c.env.DB, jobId);
        await ingestDb.finishJob(c.env.DB, jobId, "failed");
        return c.json({ ok: false, message: errorMsg }, 500);
      }

      // Insert file with guaranteed file_path (never null)
      await fileDb.insertFile(c.env.DB, {
        id: fileId,
        name: fileName,
        source: "admin",
        version,
        size_bytes: totalSize,
        checksum,
        file_path: filePath,
        upload_id: uploadId || null,
        chunk_method: chunkMethod,
        embedding_model: embeddingModel,
      });

      await fileDb.updateFile(c.env.DB, fileId, { file_status: "processing", chunk_count: normalized.length });

      // progress planning
      if (uploadId) {
        const embedBatches = Math.max(1, Math.ceil(normalized.length / BATCH_SIZE));
        const totalSteps = 1 + embedBatches + embedBatches;
        await pt.init(uploadId, `Finalize: ${fileName}`, totalSteps);
        await pt.step(uploadId, "File metadata saved");
        await pt.update(uploadId);
      }

      // Embed
      const vectors = await embedChunksInBatches(normalized, key, embeddingModel, uploadId || undefined);

      if (uploadId) {
        await pt.step(uploadId, `Embeddings done: ${normalized.length}/${normalized.length}`);
        await pt.update(uploadId);
      }

      // Save chunks to D1 (stable IDs)
      await fileDb.saveChunksBatch(c.env.DB, {
        fileId,
        fileName,
        version,
        chunks: normalized,
        embeddingModel,
        chunkMethod,
        source: "admin",
      });

      // Save to Vectorize
      for (let offset = 0; offset < normalized.length; offset += BATCH_SIZE) {
        const batch = await buildVectorizeBatch({
          fileId,
          fileName,
          version,
          embeddingModel,
          chunkMethod,
          chunks: normalized,
          vectors,
          offset,
          size: BATCH_SIZE,
        });

        let attempt = 0;
        for (;;) {
          try {
            await vectorService.storeChunks(batch, key, c.env.VECTORIZE, { embeddingModel });
            break;
          } catch (err: any) {
            attempt++;
            await ingestDb.log(c.env.DB, jobId, fileId, "WARN", `Vectorize retry ${attempt}: ${err.message}`);
            if (attempt >= 3) throw err;
            await new Promise((r) =>
              setTimeout(r, 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 200))
            );
          }
        }

        if (uploadId) {
          const done = Math.min(offset + BATCH_SIZE, normalized.length);
          await pt.step(uploadId, `Vector upload ${done}/${normalized.length}`);
          await pt.update(uploadId);
        }
      }

      await fileDb.updateFile(c.env.DB, fileId, { file_status: "completed" });
      await ingestDb.incProcessed(c.env.DB, jobId);
      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", "Finalize-approved completed");
      await ingestDb.finishJob(c.env.DB, jobId, "completed");
      if (uploadId) await pt.complete(uploadId, "Chunks finalized and uploaded");

      return c.json({
        ok: true,
        jobId,
        message: "Chunks stored successfully",
        file: fileName,
        fileId,
        version,
        fromReviewed: true,
      });
    } catch (err: any) {
      try {
        if ((body as any)?.uploadId) {
          await progressTrackerKV(c.env.CACHE).fail((body as any).uploadId, `Finalize failed: ${err.message}`);
        }
      } catch {}
      return c.json({ ok: false, message: "Chunk storage failed", error: err.message }, 500);
    }
  },


  saveNewFile: async (c: Context) => {
  const body = await c.req.json().catch(() => null);

  try {
    if (!body) return c.json({ ok: false, message: "Invalid JSON body" }, 400);

    const key = getOpenAIKey(c.env);
    if (!key) return c.json({ ok: false, message: "Missing OPENAI_API_KEY" }, 500);

    const fileName = String(body.fileName || "").trim();
    const rawText = typeof body.rawText === "string" ? body.rawText : "";
    const uploadId = body.uploadId ? String(body.uploadId) : null;

    const chunkMethod = String(body.chunkMethod || "semantic");
    const embeddingModel = String(body.embeddingModel || "text-embedding-3-small");
    const version = String(body.version || `v${Date.now()}`);

    if (!fileName) return c.json({ ok: false, message: "fileName is required." }, 400);
    if (!rawText.trim()) return c.json({ ok: false, message: "rawText is required." }, 400);
    if (rawText.length > INGEST_CONFIG.MAX_TEXT_SIZE_BYTES) {
      return c.json({ ok: false, message: `File text exceeds 10MB limit (${(rawText.length / 1024 / 1024).toFixed(1)}MB)` }, 400);
    }

    const fileId = crypto.randomUUID();
    const size = rawText.length;
    const checksum = await fileDb.contentHash(rawText);

    const jobId = await ingestDb.startJob(c.env.DB, "admin", 1);
    await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `saveNewFile start: ${fileName}`);

    // MANDATORY: Store original to R2 FIRST to get file_path before DB insert
    let r2Key: string;
    try {
      const result = await FileStorageService.putOriginalTextToPrivateR2(
        c,
        fileId,
        fileName,
        rawText
      );
      r2Key = result.key;
      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Original saved to R2: ${r2Key}`);
    } catch (e: any) {
      const errorMsg = `R2 save failed: ${e.message} - cannot proceed without file_path`;
      await ingestDb.log(c.env.DB, jobId, fileId, "ERROR", errorMsg);
      await ingestDb.incFailed(c.env.DB, jobId);
      await ingestDb.finishJob(c.env.DB, jobId, "failed");
      return c.json({ ok: false, message: errorMsg }, 500);
    }

    // Now insert file with correct file_path (NEVER null)
    await fileDb.insertFile(c.env.DB, {
      id: fileId,
      name: fileName,
      source: "admin",
      version,
      size_bytes: size,
      checksum,
      file_path: r2Key,
      upload_id: uploadId,
      chunk_method: chunkMethod,
      embedding_model: embeddingModel,
    });

    await fileDb.updateFile(c.env.DB, fileId, { file_status: "processing", error_message: null });

    await ingestDb.finishJob(c.env.DB, jobId, "completed");

    return c.json({
      ok: true,
      message: "File saved",
      fileId,
      fileName,
      version,
      checksum,
    });
  } catch (err: any) {
    return c.json({ ok: false, message: "saveNewFile failed", error: err.message }, 500);
  }
},


finalizeChunksOnly: async (c: Context) => {
  const body = await c.req.json().catch(() => null);
  const pt = progressTrackerKV(c.env.CACHE);

  try {
    if (!body) return c.json({ ok: false, message: "Invalid JSON body" }, 400);

    const key = getOpenAIKey(c.env);
    if (!key) return c.json({ ok: false, message: "Missing OPENAI_API_KEY" }, 500);

    const fileId = String(body.fileId || "").trim();
    const fileName = String(body.fileName || "").trim();
    const uploadId = body.uploadId ? String(body.uploadId) : null;

    const chunkMethod = String(body.chunkMethod || "semantic");
    const embeddingModel = String(body.embeddingModel || "text-embedding-3-small");
    const version = String(body.version || `v${Date.now()}`);

    const chunksInput = Array.isArray(body.chunks) ? body.chunks : [];
    if (!fileId) return c.json({ ok: false, message: "fileId is required." }, 400);
    if (!fileName) return c.json({ ok: false, message: "fileName is required." }, 400);
    if (!chunksInput.length) return c.json({ ok: false, message: "chunks are required." }, 400);

    const file: any = await fileDb.getFileById(c.env.DB, fileId);
    if (!file) return c.json({ ok: false, message: "File not found. Call /save-file first." }, 404);

    const jobId = await ingestDb.startJob(c.env.DB, "admin", 1);
    await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `finalizeChunksOnly start: ${fileName}`);

    const normalized = normalizeChunks(chunksInput);
    if (!normalized.length) {
      await ingestDb.finishJob(c.env.DB, jobId, "failed", "All chunks empty after normalization");
      return c.json({ ok: false, message: "All chunks empty after normalization." }, 400);
    }

    await fileDb.updateFile(c.env.DB, fileId, {
      file_status: "processing",
      chunk_count: normalized.length,
      chunk_method: chunkMethod,
      embedding_model: embeddingModel,
      version,
    });

    if (uploadId) {
      const embedBatches = Math.max(1, Math.ceil(normalized.length / BATCH_SIZE));
      const totalSteps = 1 + embedBatches + embedBatches;
      await pt.init(uploadId, `Finalize chunks: ${fileName}`, totalSteps);
      await pt.step(uploadId, `Chunks received: ${normalized.length}`);
      await pt.update(uploadId);
    }

    const vectors = await embedChunksInBatches(normalized, key, embeddingModel, uploadId || undefined);

    if (uploadId) {
      await pt.step(uploadId, `Embeddings done: ${normalized.length}/${normalized.length}`);
      await pt.update(uploadId);
    }

    await fileDb.saveChunksBatch(c.env.DB, {
      fileId,
      fileName,
      version,
      chunks: normalized,
      embeddingModel,
      chunkMethod,
      source: "admin",
    });

    for (let offset = 0; offset < normalized.length; offset += BATCH_SIZE) {
      const batch = await buildVectorizeBatch({
        fileId,
        fileName,
        version,
        embeddingModel,
        chunkMethod,
        chunks: normalized,
        vectors,
        offset,
        size: BATCH_SIZE,
      });

      let attempt = 0;
      for (;;) {
        try {
          await vectorService.storeChunks(batch, key, c.env.VECTORIZE, { embeddingModel });
          break;
        } catch (e: any) {
          attempt++;
          await ingestDb.log(c.env.DB, jobId, fileId, "WARN", `Vectorize retry ${attempt}: ${e.message}`);
          if (attempt >= 3) throw e;
          await new Promise((r) =>
            setTimeout(r, 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 200))
          );
        }
      }

      if (uploadId) {
        const done = Math.min(offset + BATCH_SIZE, normalized.length);
        await pt.step(uploadId, `Vector upload ${done}/${normalized.length}`);
        await pt.update(uploadId);
      }
    }

    await fileDb.updateFile(c.env.DB, fileId, { file_status: "completed", error_message: null });
    await ingestDb.log(c.env.DB, jobId, fileId, "INFO", "finalizeChunksOnly completed");
    await ingestDb.finishJob(c.env.DB, jobId, "completed");

    if (uploadId) await pt.complete(uploadId, "Chunks stored + vectors uploaded");

    return c.json({
      ok: true,
      message: "Chunks stored successfully",
      fileId,
      fileName,
      version,
      chunks: normalized.length,
    });
  } catch (err: any) {
    try {
      const fileId = body?.fileId ? String(body.fileId) : null;
      if (fileId) {
        await fileDb.updateFile(c.env.DB, fileId, {
          file_status: "failed",
          error_message: `finalizeChunksOnly failed: ${err.message}`,
        });
      }
    } catch {}

    try {
      if (body?.uploadId) {
        await progressTrackerKV(c.env.CACHE).fail(String(body.uploadId), `Finalize failed: ${err.message}`);
      }
    } catch {}

    return c.json({ ok: false, message: "Chunk storage failed", error: err.message }, 500);
  }
},


getAllChunks: async (c: Context) => {
    try {
      const page = Math.max(parseInt(c.req.query("page") || "1", 10), 1);
      const perPage = Math.min(Math.max(parseInt(c.req.query("perPage") || "50", 10), 1), 500);
      const search = (c.req.query("search") || "").trim();

      const { results, total } = await chunkDb.getAllChunksPaged(c.env.DB, page, perPage, search);

      return c.json({
        ok: true,
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        chunks: results,
      });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch all chunks", error: err.message }, 500);
    }
  },

  /**
   * LIST FILES
   */
  listFilesWithChunkCount: async (c: Context) => {
    try {
      const files = await fileDb.getAllFilesWithChunkCount(c.env.DB);
      return c.json({ ok: true, message: "Files with chunk count fetched successfully.", files, total: files.length });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch files", error: err.message }, 500);
    }
  },

  /**
   * GET CHUNKS BY FILE ID
   */
  getChunksByFileId: async (c: Context) => {
    try {
      const fileId = c.req.query("fileId");
      const page = parseInt(c.req.query("page") || "1", 10);
      const perPage = parseInt(c.req.query("perPage") || "50", 10);
      const search = (c.req.query("search") || "").trim();
      if (!fileId) return c.json({ ok: false, message: "fileId query param is required." }, 400);

      const { results, total } = await chunkDb.getChunksByFileId(c.env.DB, fileId, page, perPage, search);
      return c.json({
        ok: true,
        message: "Chunks fetched successfully.",
        fileId,
        page,
        perPage,
        total,
        totalPages: Math.ceil(Number(total) / perPage),
        chunks: results,
      });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch chunks", error: err.message }, 500);
    }
  },

  /**
   * DASHBOARD STATS
   */
  getDashboardStats: async (c: Context) => {
    try {
      const stats = await fileDb.getStats(c.env.DB);
      return c.json({ ok: true, message: "Stats fetched successfully.", ...stats });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch stats", error: err.message }, 500);
    }
  },

  /**
   * DELETE FILE:
   * - Delete vectors by D1 chunk IDs (now reliable because IDs match)
   * - Then delete D1 chunks + file
   */
  deleteFile: async (c: Context) => {
    const fileId = c.req.param("fileId");
    if (!fileId) return c.json({ ok: false, message: "fileId is required" }, 400);

    const jobId = await ingestDb.startJob(c.env.DB, "admin", 1);

    try {
      // 1. Find file in `files` table or `documents` table
      let fileName = "unknown";
      let fileObj: any = await fileDb.getFileById(c.env.DB, fileId);

      if (!fileObj) {
        // Try documents table (scalable-rag uploads)
        const docRes = await c.env.DB.prepare(`SELECT * FROM documents WHERE id = ?`).bind(fileId).first();
        if (docRes) {
          fileObj = docRes;
          fileName = (docRes as any).filename || "unknown";
        }
      } else {
        fileName = (fileObj as any).file_name || "unknown";
      }

      if (!fileObj) {
        await ingestDb.log(c.env.DB, jobId, fileId, "WARN", "Delete requested but file not found");
        await ingestDb.finishJob(c.env.DB, jobId, "completed");
        return c.json({ ok: true, message: "Already deleted (file not found)", fileId });
      }

      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", `Delete start: ${fileName}`);

      // 2. Vectorize Deletion (Non-blocking fallback for local dev)
      let vectorsDeleted = 0;
      let totalChunkIds = 0;

      if (c.env.VECTORIZE) {
        try {
          const CHUNK_PAGE_SIZE = 500;
          const VEC_BATCH_SIZE = 100;
          let offset = 0;

          for (;;) {
            const ids = await fileDb.getChunkIdsByFileId(c.env.DB, fileId, CHUNK_PAGE_SIZE, offset);
            if (!ids.length) break;
            totalChunkIds += ids.length;

            const res = await vectorService.deleteByIds(ids, c.env.VECTORIZE, {
              batchSize: VEC_BATCH_SIZE,
              retryLimit: 2,
            });
            vectorsDeleted += res.deleted;
            offset += CHUNK_PAGE_SIZE;
          }
        } catch (vErr: any) {
          console.warn("Vectorize delete warning (non-blocking):", vErr.message);
        }
      }

      // 3. Delete from D1 tables (chunks, files, and optional document_chunks tables)
      try {
        await fileDb.deleteChunksByFileId(c.env.DB, fileId);
      } catch (err: any) {
        console.warn("[DataController] deleteChunksByFileId warning:", err?.message);
      }
      try {
        await c.env.DB.prepare(`DELETE FROM files WHERE file_id = ?`).bind(fileId).run();
      } catch (err: any) {
        console.warn("[DataController] files delete warning:", err?.message);
      }
      try {
        await c.env.DB.prepare(`DELETE FROM document_chunks WHERE document_id = ? OR id = ?`).bind(fileId, fileId).run();
      } catch (err: any) {
        console.warn("[DataController] document_chunks delete warning:", err?.message);
      }
      try {
        await c.env.DB.prepare(`DELETE FROM documents WHERE id = ?`).bind(fileId).run();
      } catch (err: any) {
        console.warn("[DataController] documents delete warning:", err?.message);
      }

      // 4. Delete R2 files if any
      if (fileObj.file_path) {
        try {
          await FileStorageService.deleteFromR2(c, fileObj.file_path);
        } catch (err: any) {
          console.warn("[DataController] R2 delete file_path warning:", err?.message);
        }
      }
      if (fileObj.r2_key) {
        try {
          await c.env.DOCUMENTS?.delete(fileObj.r2_key);
        } catch (err: any) {
          console.warn("[DataController] DOCUMENTS delete r2_key warning:", err?.message);
        }
      }
      if (fileObj.extracted_r2_key) {
        try {
          await c.env.DOCUMENTS?.delete(fileObj.extracted_r2_key);
        } catch (err: any) {
          console.warn("[DataController] DOCUMENTS delete extracted_r2_key warning:", err?.message);
        }
      }

      // 5. Purge query cache to invalidate stale cached answers
      if (c.env.CACHE) {
        try {
          await purgeAllQueryCache(c.env.CACHE);
        } catch (err: any) {
          console.warn("[DataController] Cache purge warning:", err?.message);
        }
      }

      await ingestDb.log(c.env.DB, jobId, fileId, "INFO", "D1 & R2 delete ok: file + chunks removed");
      await ingestDb.finishJob(c.env.DB, jobId, "completed");

      return c.json({
        ok: true,
        message: "File deleted successfully",
        fileId,
        fileName,
        totalChunks: totalChunkIds,
        vectorsDeleted,
      });
    } catch (err: any) {
      console.error("Delete file failed:", err);
      return c.json({ ok: false, message: "Delete failed", fileId, error: err.message }, 500);
    }
  },


  /**
   * DOWNLOAD FILE (requires admin key):
   * - Reads R2 key from D1 file_path
   * - Streams text back
   */
  downloadFile: async (c: Context) => {
    try {
      const adminKey = c.req.header("x-admin-key");
      if (adminKey !== c.env.ADMIN_API_KEY) return c.json({ ok: false, message: "Unauthorized" }, 401);

      const fileId = c.req.param("fileId");
      if (!fileId) return c.json({ ok: false, message: "fileId is required" }, 400);

      const file: any = await fileDb.getFileById(c.env.DB, fileId);
      if (!file) return c.json({ ok: false, message: "File not found" }, 404);

      const fileName = String(file.file_name || "knowledge.txt");
      const r2Key = file.file_path;

      if (!r2Key) return c.json({ ok: false, message: "File not stored in R2 yet." }, 404);

      const obj = await FileStorageService.getPrivateObjectByKey(c, r2Key);
      if (!obj) return c.json({ ok: false, message: "Not found in R2" }, 404);

      return FileStorageService.buildDownloadResponse(obj.body, fileName);
    } catch (err: any) {
      return c.json({ ok: false, message: "Download failed", error: err.message }, 500);
    }
  },

  /**
   * Ingest event endpoints (unchanged logic, kept stable)
   */
  logIngestEvent: async (c: Context) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as {
        level?: string;
        message?: string;
        jobId?: string | null;
        fileId?: string | null;
      };

      const message = (body.message || "").toString().trim();
      if (!message) return c.json({ ok: false, message: "message is required" }, 400);

      const level = safeLevel(body.level) as "INFO" | "WARN" | "ERROR";
      await ingestDb.log(c.env.DB, body.jobId ?? null, body.fileId ?? null, level, message);

      return c.json({ ok: true });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to log event", error: err.message }, 500);
    }
  },

  startIngestJob: async (c: Context) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as { source?: "admin" | "cron"; total_files?: number };
      const source = body.source === "cron" ? "cron" : "admin";
      const total = Number.isFinite(body.total_files) ? Number(body.total_files) : 0;

      const jobId = await ingestDb.startJob(c.env.DB, source, total);
      await ingestDb.log(c.env.DB, jobId, null, "INFO", "Job started");

      return c.json({ ok: true, job_id: jobId });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to start job", error: err.message }, 500);
    }
  },

  finishIngestJob: async (c: Context) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as { job_id?: string; status?: "completed" | "failed"; error?: string };
      if (!body.job_id) return c.json({ ok: false, message: "job_id is required" }, 400);

      const status: "completed" | "failed" = body.status === "failed" ? "failed" : "completed";
      const errorMsg = typeof body.error === "string" && body.error.trim() ? body.error : undefined;

      await ingestDb.finishJob(c.env.DB, body.job_id, status, errorMsg);
      await ingestDb.log(
        c.env.DB,
        body.job_id,
        null,
        status === "failed" ? "ERROR" : "INFO",
        status === "failed" ? `Job failed${errorMsg ? `: ${errorMsg}` : ""}` : "Job completed"
      );

      return c.json({ ok: true, job_id: body.job_id, status });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to finish job", error: err.message }, 500);
    }
  },

  getIngestJobById: async (c: Context) => {
    const jobId = c.req.param("jobId");
    if (!jobId) return c.json({ ok: false, message: "jobId required" }, 400);

    const row = await c.env.DB.prepare("SELECT * FROM ingest_jobs WHERE id = ? LIMIT 1").bind(jobId).first();
    if (!row) return c.json({ ok: false, message: "Not found" }, 404);

    return c.json({ ok: true, job: row });
  },

  getIngestEvents: async (c: Context) => {
    const jobId = c.req.query("jobId");
    const fileId = c.req.query("fileId");
    const limit = Math.min(parseInt(c.req.query("limit") || "200", 10), 1000);
    const sinceId = c.req.query("sinceId");
    if (!jobId && !fileId) return c.json({ ok: false, message: "jobId or fileId required" }, 400);

    const base = jobId ? "FROM ingest_events WHERE job_id = ?" : "FROM ingest_events WHERE file_id = ?";
    const where = sinceId ? `${base} AND id > ?` : base;
    const sql = `SELECT id, level, message, at, file_id ${where} ORDER BY id ASC LIMIT ?`;

    const params = sinceId ? [jobId || fileId, sinceId, String(limit)] : [jobId || fileId, String(limit)];
    const res = await c.env.DB.prepare(sql).bind(...params).all();

    return c.json({ ok: true, events: res.results || [] });
  },

  getRelatedTiers: async (c: Context) => {
    try {
      const chunkId = c.req.param("chunkId");
      if (!chunkId) return c.json({ ok: false, message: "Missing chunkId" }, 400);

      const tiers = await chunkDb.getRelatedTiers(c.env.DB, chunkId);
      if (!tiers) return c.json({ ok: false, message: "Chunk not found" }, 404);

      return c.json({ ok: true, ...tiers });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch related tiers", error: err.message }, 500);
    }
  },

  updateChunk: async (c: Context) => {
    try {
      const chunkId = c.req.param("chunkId");
      if (!chunkId) {
        return c.json({ ok: false, message: "Missing chunkId parameter" }, 400);
      }

      const body = await c.req.json().catch(() => ({}));
      const { content, topic, section, tags, relatedTiers } = body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return c.json({ ok: false, message: "Chunk content cannot be empty" }, 400);
      }

      // 1. Update primary D1 database chunk
      const updated = await chunkDb.updateChunk(c.env.DB, chunkId, {
        content: content.trim(),
        topic: topic !== undefined ? String(topic).trim() : undefined,
        section: section !== undefined ? String(section).trim() : undefined,
        tags: tags !== undefined ? tags : undefined,
      });

      if (!updated) {
        return c.json({ ok: false, message: "Chunk not found in database" }, 404);
      }

      // 2. Re-embed primary chunk and update Vectorize index
      const key = (c.env.OPENAI_API_KEY || (await c.env.CONFIG.get("OPENAI_API_KEY")))?.trim();
      let vectorUpdated = false;
      let extraUpdatedCount = 0;

      if (c.env.VECTORIZE && key) {
        try {
          let parsedTags: string[] = [];
          if (typeof updated.tags === "string") {
            try { parsedTags = JSON.parse(updated.tags); } catch { parsedTags = updated.tags.split(",").map((t: string) => t.trim()).filter(Boolean); }
          } else if (Array.isArray(updated.tags)) {
            parsedTags = updated.tags;
          }

          await vectorService.storeChunks(
            [{
              id: chunkId,
              content: updated.content,
              index: 0,
              topic: updated.topic || "general",
              section: updated.section || "",
              tags: parsedTags,
              firstSentence: updated.first_sentence,
            }],
            key,
            c.env.VECTORIZE
          );
          vectorUpdated = true;
        } catch (vecErr: any) {
          console.warn("Vectorize re-indexing warning:", vecErr?.message || vecErr);
        }
      }

      // 3. Process related tiers if provided (Solution 3 Multi-Tier Edit)
      if (Array.isArray(relatedTiers) && relatedTiers.length > 0) {
        for (const rel of relatedTiers) {
          if (!rel || !rel.chunk_id || rel.chunk_id === chunkId || !rel.content) continue;

          const relUpdated = await chunkDb.updateChunk(c.env.DB, rel.chunk_id, {
            content: String(rel.content).trim(),
            topic: rel.topic !== undefined ? String(rel.topic).trim() : undefined,
            section: rel.section !== undefined ? String(rel.section).trim() : undefined,
            tags: rel.tags !== undefined ? rel.tags : undefined,
          });

          if (relUpdated) {
            extraUpdatedCount++;
            if (c.env.VECTORIZE && key) {
              try {
                let relTags: string[] = [];
                if (typeof relUpdated.tags === "string") {
                  try { relTags = JSON.parse(relUpdated.tags); } catch { relTags = relUpdated.tags.split(",").map((t: string) => t.trim()).filter(Boolean); }
                } else if (Array.isArray(relUpdated.tags)) { relTags = relUpdated.tags; }

                await vectorService.storeChunks([{
                  id: rel.chunk_id,
                  content: relUpdated.content,
                  index: 0,
                  topic: relUpdated.topic || "general",
                  section: relUpdated.section || "",
                  tags: relTags,
                  firstSentence: relUpdated.first_sentence,
                }], key, c.env.VECTORIZE);
              } catch {}
            }
          }
        }
      }

      // 4. Purge RAG response cache so future user queries immediately retrieve updated knowledge
      if (c.env.CACHE) {
        try { await purgeAllQueryCache(c.env.CACHE); } catch {}
      }

      return c.json({
        ok: true,
        message: extraUpdatedCount > 0
          ? `Primary chunk and ${extraUpdatedCount} related tier(s) updated & re-indexed`
          : "Chunk updated & vector re-indexed successfully",
        chunk: updated,
        vectorUpdated,
        extraUpdatedCount,
      });
    } catch (err: any) {
      console.error("updateChunk failed:", err);
      return c.json({ ok: false, message: "Failed to update chunk", error: err.message }, 500);
    }
  },

  deleteChunk: async (c: Context) => {
    try {
      const chunkId = c.req.param("chunkId");
      if (!chunkId) {
        return c.json({ ok: false, message: "Missing chunkId parameter" }, 400);
      }

      // 1. Delete from Cloudflare Vectorize Index
      let vectorDeleted = false;
      if (c.env.VECTORIZE) {
        try {
          await vectorService.deleteByIds([chunkId], c.env.VECTORIZE);
          vectorDeleted = true;
        } catch (vErr: any) {
          console.warn("Vectorize chunk delete warning:", vErr.message);
        }
      }

      // 2. Delete from D1 Database
      const deleted = await chunkDb.deleteChunk(c.env.DB, chunkId);
      if (!deleted) {
        return c.json({ ok: false, message: "Chunk not found" }, 404);
      }

      // 3. Invalidate RAG Cache
      if (c.env.CACHE) {
        try { await purgeAllQueryCache(c.env.CACHE); } catch {}
      }

      return c.json({
        ok: true,
        message: "Chunk deleted successfully",
        chunkId,
        vectorDeleted,
      });
    } catch (err: any) {
      console.error("deleteChunk failed:", err);
      return c.json({ ok: false, message: "Failed to delete chunk", error: err.message }, 500);
    }
  },
};

