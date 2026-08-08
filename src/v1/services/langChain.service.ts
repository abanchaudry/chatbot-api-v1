import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { progressTracker } from "../utils/progress-tracker";
import { ChunkValidator } from "../utils/chunk-validator";

export interface Chunk {
  content: string;
  section: string;
  tags?: string[];
  topic?: string;
  index: number;
  charStart?: number;
  charEnd?: number;
}

type ChunkerOptions = {
  baseChunkSize?: number;
  chunkOverlap?: number;
  minChunkSize?: number;
  maxChunks?: number;
  extraStopwords?: string[];
};

const DEFAULTS: Required<Omit<ChunkerOptions, "extraStopwords">> = {
  baseChunkSize: 900,
  chunkOverlap: 120,
  minChunkSize: 320,
  maxChunks: 8000,
};

function normalizeText(raw: string) {
  let t = raw.replace(/\r\n/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n{4,}/g, "\n\n\n");
  return t.trim();
}

const HARD_SECTION_REGEX =
  /(^|\n)(?:#{1,3}\s+[^\n]+|[A-Z][^\n]{6,120}\n[-=]{3,}|(?:\d+[\).\s-]+[^\n]{6,120})|(?:[^\n]{8,120}:\s*$))/g;

function preSplitSections(t: string) {
  const parts: { start: number; end: number; text: string }[] = [];
  const idxs: number[] = [0];

  let m: RegExpExecArray | null;
  while ((m = HARD_SECTION_REGEX.exec(t)) !== null) {
    const pos = m.index + (m[0].startsWith("\n") ? 1 : 0);
    if (pos > 0) idxs.push(pos);
  }
  idxs.push(t.length);

  const uniq = Array.from(new Set(idxs)).sort((a, b) => a - b);
  for (let i = 0; i < uniq.length - 1; i++) {
    const start = uniq[i];
    const end = uniq[i + 1];
    const seg = t.slice(start, end).trim();
    if (seg) parts.push({ start, end, text: seg });
  }
  return parts;
}

function detectSectionLabel(txt: string, fallback: string) {
  const m1 = txt.match(/^\s*#{1,3}\s+([^\n]{3,120})/m);
  if (m1 && m1[1]) return m1[1].trim();

  const lines = txt.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length) {
    const first = lines[0];
    if (first.length >= 6 && first.length <= 120) return first;
  }

  const m2 = txt.slice(0, 260).match(/^[A-Z][^\n]{6,120}$/m);
  if (m2 && m2[0]) return m2[0].trim();

  return fallback;
}

const BASE_STOP = new Set([
  "the","and","for","with","that","this","from","into","your","you",
  "not","are","any","all","but","has","have","had","been","being","was","were",
  "under","over","onto","per","within","upon",
  "a","an","of","to","in","on","by","as","at","it","its","or","if","is"
]);

function extractTagsFromFirstSentence(txt: string, max = 4, extraStop?: string[]): string[] {
  const stop = new Set([...BASE_STOP, ...(extraStop || [])].map((s) => s.toLowerCase()));
  const firstSentence = (txt.split(/(?<=[.!?])\s+/)[0] || txt.slice(0, 180)).toLowerCase();
  const cleaned = firstSentence.replace(/[“”‘’"']/g, "").replace(/[—–-]/g, "-");
  const terms = (cleaned.match(/[a-z0-9][a-z0-9\-]{2,}/g) || []).filter((w) => !stop.has(w));
  const dedup: string[] = [];
  for (const w of terms) {
    if (!dedup.includes(w)) dedup.push(w);
    if (dedup.length >= max) break;
  }
  return dedup;
}

function inferTopic(section: string, tags: string[], content: string) {
  const s = (section || "").toLowerCase();
  const c = (content || "").toLowerCase();

  if (/\bfaq\b|\bq&a\b|\bquestions?\b|\banswers?\b/.test(s) || /\bfaq\b|\bq&a\b|\bquestion\b|\banswer\b/.test(c)) return "faq";
  if (/\bpolicy\b|\bprivacy\b|\bterms\b|\brefund\b|\breturns?\b|\bsecurity\b|\bcompliance\b/.test(s) || /\bpolicy\b|\bprivacy\b|\bterms\b|\brefund\b|\breturn\b|\bsecurity\b|\bcompliance\b/.test(c)) return "policy";
  if (/\bguide\b|\bhow[- ]?to\b|\bmanual\b|\binstructions?\b|\bsetup\b|\bconfigure\b/.test(s) || /\bhow to\b|\bstep[- ]?by[- ]?step\b|\bsetup\b|\bconfigure\b/.test(c)) return "guide";

  if (tags && tags.length) return tags[0];
  return "general";
}

export class LangChainChunkingService {
  private opts: Required<Omit<ChunkerOptions, "extraStopwords">>;
  private extraStop: string[] | undefined;

  constructor(options?: ChunkerOptions) {
    const { extraStopwords, ...rest } = options || {};
    this.opts = { ...DEFAULTS, ...(rest || {}) };
    this.extraStop = extraStopwords;
  }

  async generateChunksOnly(rawText: string, fileName: string, uploadId?: string): Promise<Chunk[]> {
    if (uploadId && !progressTracker.get(uploadId)) {
      progressTracker.init(uploadId, `Preview: ${fileName}`, 1);
    }
    if (uploadId) progressTracker.step(uploadId, `Chunking started (LangChain) for "${fileName}"`);

    const text = normalizeText(rawText);
    const len = text.length;

    let chunkSize = this.opts.baseChunkSize;
    if (len < 10_000) chunkSize = Math.max(520, Math.floor(this.opts.baseChunkSize * 0.85));
    if (len > 80_000) chunkSize = Math.floor(this.opts.baseChunkSize * 1.2);

    const hardParts = preSplitSections(text);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap: this.opts.chunkOverlap,
      separators: [
        "\n\n## ",
        "\n\n# ",
        "\n\n### ",
        "\n\n",
        "\n",
        " ",
        ""
      ],
    });

    const all: { content: string; start: number; end: number }[] = [];

    for (const part of hardParts) {
      const docs = await splitter.createDocuments([part.text]);

      const merged: string[] = [];
      for (const d of docs) {
        const t = d.pageContent.trim();
        if (!t) continue;
        if (merged.length && t.length < this.opts.minChunkSize) {
          merged[merged.length - 1] = `${merged[merged.length - 1]}\n\n${t}`;
        } else {
          merged.push(t);
        }
      }

      let cursor = part.start;
      for (const m of merged) {
        const local = part.text.indexOf(m, Math.max(0, cursor - part.start));
        const start = local >= 0 ? part.start + local : cursor;
        const end = start + m.length;
        all.push({ content: m, start, end });
        cursor = end;
      }
    }

    if (all.length > this.opts.maxChunks) {
      const bigger = Math.floor(chunkSize * 1.6);
      const coarseSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: bigger,
        chunkOverlap: Math.floor(this.opts.chunkOverlap / 2),
        separators: ["\n\n", "\n", " ", ""],
      });
      const docs = await coarseSplitter.createDocuments([text]);
      const coalesced = docs.map((d) => d.pageContent).filter(Boolean);

      let offset = 0;
      const tmp: typeof all = [];
      for (const c of coalesced) {
        const idx = text.indexOf(c, offset);
        const s = idx >= 0 ? idx : offset;
        const e = s + c.length;
        tmp.push({ content: c, start: s, end: e });
        offset = e;
      }
      all.length = 0;
      all.push(...tmp);
    }

    const filtered = all.filter((c) => c.content.trim().length > 0);

    const chunks: Chunk[] = filtered.map((c, i) => {
      const section = detectSectionLabel(c.content, `Section ${i + 1}`);
      const tags = extractTagsFromFirstSentence(c.content, 4, this.extraStop);
      const topic = inferTopic(section, tags, c.content);
      return {
        content: c.content,
        section,
        tags,
        topic,
        index: i,
        charStart: c.start,
        charEnd: c.end,
      };
    });

    // Validate chunk quality and suggest improvements
    const validation = ChunkValidator.validate(chunks, rawText);
    if (!validation.valid) {
      console.warn(`LangChain chunking quality issues: ${validation.issues.length} issues (coverage: ${(validation.coverage.percentageOfSource * 100).toFixed(1)}%)`);
    }

    if (uploadId) {
      progressTracker.step(uploadId, `Chunks generated (LangChain): ${chunks.length} (coverage: ${(validation.coverage.percentageOfSource * 100).toFixed(1)}%)`);
      progressTracker.update(uploadId);
    }

    return chunks;
  }
}
