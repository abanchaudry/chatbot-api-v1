// src/v5/utils/ask-helper.ts

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { format } from "date-fns";

import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";

import type { Env } from "../types/env";
import { vectorService, type VectorHit } from "../services/vector.service";

import { rerankPrompt } from "../prompts/rerank.prompt";
import { answerPrompt } from "../prompts/answer.prompt";
import { smallTalkPrompt } from "../prompts/smalltalk.prompt";
import { languageMismatchPrompt } from "../prompts/language.prompt";
import { clarifyPrompt } from "../prompts/clarify.prompt";

import { messageTracesDb } from "../services/db/message-traces.db";
import { chunkDb } from "../services/db/chunk.db";
import { logger } from "./logger";
import { messagesdb } from "../services/db/messages.db";
import { threaddb } from "../services/db/thread.db";

/* -------------------------------------------------------------------------- */
/*                                   CONSTANTS                                */
/* -------------------------------------------------------------------------- */

export const FALLBACK_MESSAGE_DEFAULT =
  "I’m sorry — I don’t have enough information to answer that.";

export const LIMITS = {
  historyPreviewChars: 6500,
  vecTopK: 25,
  webTopK: 40,
  pdfTopK: 25,
  keepVecPre: 25,
  keepWebPre: 30,
  keepPdfPre: 20,
  rerankMaxItems: 8,
  finalEvidenceMax: 20,
  minKeepPerSource: 10,
  maxTextOther: 8000,
  maxTextVector: 16000,
} as const;

/* -------------------------------------------------------------------------- */
/*                                     TYPES                                  */
/* -------------------------------------------------------------------------- */

export type RetrieveReason = "ok" | "disabled" | "error";

export type Piece = {
  sourceType: "vector" | "web" | "pdf" | "autorag_response";
  sourceId: string;
  score: number; // 0..100
  rawScore: number; // 0..1
  priority?: number;
  title?: string;
  url?: string;
  section?: string;
  text: string;
  meta?: Record<string, any>;
};

export type AskPolicy = {
  enableWeb: boolean;
  enablePdf: boolean;

  enableAutoragWeb: boolean;
  autoragName: string;
  autoragTopK: number;
  autoragAlwaysIncludeK: number;
  autoragScoreThreshold01: number;
  autoragRewriteQuery: boolean;
  autoragRerankEnabled: boolean;
  autoragModel: string;
  autoragRerankModel: string;

  minVectorScore: number;
  minWebScore: number;
  minPdfScore: number;

  rrfK: number;
  hybridLexicalEnabled: boolean;
  publicLogsEnabled: boolean;

  enableCFRerank: boolean;
  cfRerankModel: string;
  cfRerankTopK: number;
  cfRerankMinScore01: number;
};

export type RuntimeLimits = {
  vecTopK: number;
  webTopK: number;
  pdfTopK: number;
  keepVecPre: number;
  keepWebPre: number;
  keepPdfPre: number;
  rerankMaxItems: number;
  finalEvidenceMax: number;
};

export type PrimaryEvidenceGateResult = {
  status: "pass" | "rescue";
  reason:
    | "enough_evidence"
    | "no_primary_evidence"
    | "low_primary_scores";
  keptPieces: Piece[];
  metrics: {
    count: number;
    topScore: number;
    avgScore: number;
  };
};

export type AnswerQuality = "good" | "weak" | "fallback";

export type LlmRerankResult = {
  kept: Piece[];
  rawText: string;
};

export type ParsedRerankOutput = {
  keepIds: number[];
  coverage: number | null;
};

export type AutoragRescueNormalized = {
  ok: boolean;
  answer: string;
  reason: RetrieveReason | "empty";
  pieces: Piece[];
  meta?: Record<string, any>;
};

export type PersistStatus = "success" | "degraded" | "failure";

export type LocalEvidenceAssessment = {
  sufficient: boolean;
  exactEntityMatch?: boolean;
  exactPhraseMatch?: boolean;
  exactSectionMatch: boolean;
  keywordHybridHits: number;
  hybridHits: number;
  rerankKept: number;
  rerankCoverage?: number | null;
  topScore: number;
  avgScore: number;
  contentQualityValid: boolean;
  reasons: string[];
  intent?: string;
  searchMode?: string;
};

/* -------------------------------------------------------------------------- */
/*                               BASIC UTILITIES                              */
/* -------------------------------------------------------------------------- */

export function now() {
  return Date.now();
}

export function approxTokens(chars: number) {
  return Math.max(0, Math.round((Number(chars || 0) || 0) / 4));
}

/**
 * Validate that context + expected answer won't exceed token limit (GPT-4 context window)
 * Returns { ok: boolean, tokensContext: number, tokensEstimatedMax: number, warning?: string }
 */
export function validateTokenLimit(
  contextChars: number,
  questionChars: number,
  fallbackChars: number,
  maxContextTokens: number = 6000 // Safety limit for 8K model
) {
  const tokensContext = approxTokens(contextChars);
  const tokensQuestion = approxTokens(questionChars);
  const tokensFallback = approxTokens(fallbackChars);
  const tokensEstimatedMax = tokensContext + tokensQuestion + tokensFallback + 500; // +500 for overhead

  return {
    ok: tokensEstimatedMax <= maxContextTokens,
    tokensContext,
    tokensEstimatedMax,
    warning: tokensEstimatedMax > maxContextTokens ? 
      `Context too large: ${tokensEstimatedMax} tokens (limit: ${maxContextTokens})` : 
      undefined,
  };
}

/**
 * Validate that pieces contain substantive content (not just metadata/fragments)
 */
export function validateContentQuality(
  pieces: Piece[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!pieces.length) {
    issues.push("No pieces to validate");
    return { valid: false, issues };
  }

  // Check for too many very short pieces (likely metadata)
  const shortPieces = pieces.filter((p) => String(p.text || "").length < 50);
  if (shortPieces.length > pieces.length * 0.5) {
    issues.push(
      `Too many short pieces (${shortPieces.length}/${pieces.length}): likely metadata without substance`
    );
  }

  // Check for duplicate content (malformed retrieval)
  const uniqueTexts = new Set(pieces.map((p) => p.text.slice(0, 100)));
  if (uniqueTexts.size < pieces.length * 0.7) {
    issues.push(
      `High duplication: only ${uniqueTexts.size}/${pieces.length} unique pieces`
    );
  }

  // Check average score distribution
  const avgScore =
    pieces.reduce((sum, p) => sum + (p.score || 0), 0) / pieces.length;
  if (avgScore < 20) {
    issues.push(
      `Low average relevance score: ${Math.round(avgScore)} (should be > 30)`
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export async function timeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: any;
  const timeoutP = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label}:timeout`)), ms);
  });

  try {
    return await Promise.race([p, timeoutP]);
  } finally {
    clearTimeout(t);
  }
}

export function normalizeLanguage(v: any): "english" | "spanish" {
  const s = String(v || "").toLowerCase().trim();
  return s === "spanish" ? "spanish" : "english";
}

export function makeThreadId(userId: string, seed: string | null) {
  const d = format(new Date(), "yyyy-MM-dd_HHmmss");
  const n = nanoid(6);
  return `${userId}_${d}_${seed ? seed + "_" : ""}${n}`;
}

export function sortByScoreDesc(a: { score?: number }, b: { score?: number }) {
  return (Number(b?.score || 0) || 0) - (Number(a?.score || 0) || 0);
}

function clamp100(n: number) {
  return Math.max(0, Math.min(100, Math.round(Number(n || 0))));
}

function clamp01(n: number) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function readInt(v: any, fallback: number, min = 0, max = 500) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function readFloat(v: any, fallback: number, min = 0, max = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeStr(v: any, max = 900) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function safeJsonParseWithObjectRecovery<T>(text: string, fallback: T): T {
  const direct = safeJsonParse(text, fallback);
  if (direct !== fallback) return direct;

  const source = String(text || "");
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");

  if (start < 0 || end <= start) return fallback;

  return safeJsonParse(source.slice(start, end + 1), fallback);
}

function normalizeForFallbackCompare(input: string) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/*                              RUNTIME / POLICY                              */
/* -------------------------------------------------------------------------- */

export function getRuntimeLimits(env: Env["Bindings"]): RuntimeLimits {
  const anyEnv = env as any;

  return {
    vecTopK: readInt(anyEnv.MAX_VEC_TOPK, LIMITS.vecTopK, 1, 200),
    webTopK: readInt(anyEnv.MAX_WEB_TOPK, LIMITS.webTopK, 1, 200),
    pdfTopK: readInt(anyEnv.MAX_PDF_TOPK, LIMITS.pdfTopK, 1, 200),
    keepVecPre: readInt(anyEnv.KEEP_VEC_PRE, LIMITS.keepVecPre, 1, 200),
    keepWebPre: readInt(anyEnv.KEEP_WEB_PRE, LIMITS.keepWebPre, 1, 200),
    keepPdfPre: readInt(anyEnv.KEEP_PDF_PRE, LIMITS.keepPdfPre, 0, 200),
    rerankMaxItems: readInt(anyEnv.RERANK_MAX_ITEMS, LIMITS.rerankMaxItems, 1, 20),
    finalEvidenceMax: readInt(anyEnv.FINAL_EVIDENCE_MAX, LIMITS.finalEvidenceMax, 1, 60),
  };
}

export function buildPolicy(env: Env["Bindings"]): AskPolicy {
  const anyEnv = env as any;

  const enableWeb = String(anyEnv.ENABLE_WEB_SEARCH || "false") === "true";
  const enablePdf = String(anyEnv.ENABLE_PDF_SEARCH || "false") === "true";
  const publicLogsEnabled = String(anyEnv.PUBLIC_LOGS_ENABLED || "true") === "true";

  const rrfK = Number(anyEnv.RRF_K || 60) || 60;
  const hybridLexicalEnabled = String(anyEnv.HYBRID_LEXICAL || "true") === "true";

  const enableCFRerank = String(anyEnv.ENABLE_CF_RERANK || "false") === "true";
  const cfRerankModel = String(anyEnv.CF_RERANK_MODEL || "@cf/baai/bge-reranker-base").trim();
  const cfRerankTopK = readInt(anyEnv.CF_RERANK_TOPK, LIMITS.finalEvidenceMax, 1, 60);
  const cfRerankMinScore01 = readFloat(anyEnv.CF_RERANK_MIN_SCORE, 0, 0, 1);

  const enableAutoragWeb = String(anyEnv.ENABLE_AUTORAG_WEB || "true") === "true";
  const autoragName = String(anyEnv.AUTORAG_NAME || anyEnv.CF_AUTORAG_NAME || "").trim();
  const autoragTopK = readInt(anyEnv.AUTORAG_TOPK, 10, 1, 50);
  const autoragAlwaysIncludeK = readInt(anyEnv.AUTORAG_ALWAYS_INCLUDE_K, 2, 0, 20);
  const autoragScoreThreshold01 = readFloat(anyEnv.AUTORAG_SCORE_THRESHOLD, 0.3, 0, 1);
  const autoragRewriteQuery = String(anyEnv.AUTORAG_REWRITE_QUERY || "false") === "true";
  const autoragRerankEnabled = String(anyEnv.AUTORAG_RERANK_ENABLED || "true") === "true";
  const autoragModel = String(
    anyEnv.AUTORAG_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  ).trim();
  const autoragRerankModel = String(
    anyEnv.AUTORAG_RERANK_MODEL || "@cf/baai/bge-reranker-base"
  ).trim();

  return {
    enableWeb,
    enablePdf,

    enableAutoragWeb,
    autoragName,
    autoragTopK,
    autoragAlwaysIncludeK,
    autoragScoreThreshold01,
    autoragRewriteQuery,
    autoragRerankEnabled,
    autoragModel,
    autoragRerankModel,

    minVectorScore: Number(anyEnv.MIN_VECTOR_SCORE || 35) || 35,
    minWebScore: Number(anyEnv.MIN_WEB_SCORE || 35) || 35,
    minPdfScore: Number(anyEnv.MIN_PDF_SCORE || 30) || 30,

    rrfK,
    hybridLexicalEnabled,
    publicLogsEnabled,

    enableCFRerank,
    cfRerankModel,
    cfRerankTopK,
    cfRerankMinScore01,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   CHAINS                                   */
/* -------------------------------------------------------------------------- */

export function buildChains(apiKey: string, models?: { chat?: string; rerank?: string }) {
  const chatModel = models?.chat || "gpt-4o-mini";
  const rerankModel = models?.rerank || chatModel;

  const modelChat = new ChatOpenAI({
    apiKey,
    model: chatModel,
    temperature: 0,
  });

  const modelRerank = new ChatOpenAI({
    apiKey,
    model: rerankModel,
    temperature: 0,
  });

  const smallTalk = RunnableSequence.from([
    smallTalkPrompt as any,
    modelChat as any,
    new StringOutputParser(),
  ]);

  const langMismatch = RunnableSequence.from([
    languageMismatchPrompt as any,
    modelChat as any,
    new StringOutputParser(),
  ]);

  const clarify = RunnableSequence.from([
    clarifyPrompt as any,
    modelChat as any,
    new StringOutputParser(),
  ]);

  const answer = RunnableSequence.from([
    answerPrompt as any,
    modelChat as any,
    new StringOutputParser(),
  ]);

  const rerank = RunnableSequence.from([
    rerankPrompt as any,
    modelRerank as any,
    new StringOutputParser(),
  ]);

  return { smallTalk, langMismatch, clarify, answer, rerank };
}

/* -------------------------------------------------------------------------- */
/*                              EMBEDDING / VECTOR                            */
/* -------------------------------------------------------------------------- */

export async function embedVector(
  apiKey: string,
  text: string,
  model = "text-embedding-3-small"
) {
  const embeddings = new OpenAIEmbeddings({ apiKey, model });
  return embeddings.embedQuery(String(text || ""));
}

export async function retrieveVector(
  env: Env["Bindings"],
  apiKey: string,
  embedding: number[],
  topK: number
): Promise<Piece[]> {
  if (!env?.VECTORIZE) {
    console.warn("retrieveVector: env.VECTORIZE not active in local dev — skipping dense vector search");
    return [];
  }
  try {
    const hits: VectorHit[] = await vectorService.searchChunks(
      embedding,
      apiKey,
      env.VECTORIZE,
      topK
    );

    return (hits || []).map((h, i) => ({
      sourceType: "vector",
      sourceId: String(h?.metadata?.chunk_id || h?.metadata?.id || `vec_${i}`),
      score: clamp100(h?.score100 ?? 0),
      rawScore: clamp01(h?.score01 ?? 0),
      title: String(h?.metadata?.title || h?.metadata?.first_sentence || ""),
      url: String(h?.metadata?.url || ""),
      section: String(h?.metadata?.section_number || h?.metadata?.section || ""),
      text: String(h?.text || ""),
      meta: h?.metadata || {},
    }));
  } catch (err: any) {
    console.warn("retrieveVector warning (non-blocking):", err.message);
    return [];
  }
}


/* -------------------------------------------------------------------------- */
/*                         PRIMARY EVIDENCE / CONTEXT                         */
/* -------------------------------------------------------------------------- */

export function dedupePiecesByKey(pieces: Piece[]) {
  const seen = new Set<string>();
  const out: Piece[] = [];

  for (const p of pieces || []) {
    const k = `${p.sourceType}::${p.sourceId}::${p.url || ""}::${p?.meta?.__origin || ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }

  return out;
}

export function dedupeByKeyKeepOrder(pieces: Piece[]) {
  return dedupePiecesByKey(pieces);
}

export function buildGroupedContextFromPieces(pieces: Piece[]) {
  return (pieces || [])
    .map((p) => {
      const header = [
        `TYPE=${p.sourceType.toUpperCase()}`,
        `SCORE=${p.score ?? 0}`,
        p.title ? `TITLE=${p.title}` : "",
        p.url ? `URL=${p.url}` : "",
        p.section ? `SECTION=${p.section}` : "",
        p?.meta?.__origin ? `ORIGIN=${String(p.meta.__origin)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `${header}\n${String(p.text || "").trim()}`;
    })
    .join("\n\n---\n\n");
}

export function buildGroupedContext(pieces: Piece[]) {
  return buildGroupedContextFromPieces(pieces);
}

export function buildFinalEvidenceVectorPlusAutorag(
  vectorPieces: Piece[],
  autoragPieces: Piece[],
  finalMax: number
) {
  const v = dedupePiecesByKey(vectorPieces || []);
  const a = dedupePiecesByKey(autoragPieces || []);

  const out: Piece[] = [];

  for (const p of v) {
    out.push(p);
    if (out.length >= finalMax) return out.slice(0, finalMax);
  }

  for (const p of a) {
    out.push(p);
    if (out.length >= finalMax) return out.slice(0, finalMax);
  }

  return out.slice(0, finalMax);
}

export function buildFinalPrimaryEvidence(
  pieces: Piece[],
  finalMax: number
) {
  const allowed = (pieces || []).filter(
    (p) => p.sourceType === "vector" || p.sourceType === "web" || p.sourceType === "pdf"
  );

  return dedupePiecesByKey(allowed).slice(0, finalMax);
}

type HybridChunkRow = {
  chunk_id: string;
  content: string;
  topic?: string;
  first_sentence?: string;
  section_number?: string;
  section?: string;
  file_id?: string;
  tags?: string[] | string | null;
};

function extractQuotedPhrases(question: string): string[] {
  const quoted = String(question || "").match(/"([^"]+)"|'([^']+)'/g) || [];
  return quoted
    .map((phrase) => phrase.replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

function normalizePhraseText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractQuestionFocusPhrases(question: string): string[] {
  const normalized = normalizePhraseText(question);
  if (!normalized) return [];

  const patterns = [
    /^(?:what is|what s|whats|show me|tell me|give me|share|find|need|looking for)\s+(?:the\s+)?(.+)$/,
    /^(?:where can i find|do you have|can you share|can you tell me)\s+(?:the\s+)?(.+)$/,
  ];

  const matches = patterns
    .map((pattern) => normalized.match(pattern)?.[1] || "")
    .map((value) =>
      value
        .replace(/\b(?:please|thanks|thank you)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const focusPhrases = new Set<string>();

  for (const match of matches) {
    focusPhrases.add(match);

    const trimmed = match.replace(/\b(?:of|for|about)\s+[a-z0-9\s]{2,40}$/g, "").trim();
    if (trimmed && trimmed !== match) focusPhrases.add(trimmed);
  }

  return Array.from(focusPhrases).filter((value) => value.split(/\s+/).length <= 8);
}

function getBoostPhrases(question: string): string[] {
  return Array.from(
    new Set([
      ...extractQuestionFocusPhrases(question),
      ...extractQuotedPhrases(question),
    ])
  ).filter(Boolean);
}

function parseTags(tags: HybridChunkRow["tags"]): string[] {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || "").trim()).filter(Boolean);
  if (!tags) return [];
  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function computeHybridPieceScore(args: {
  question: string;
  row: HybridChunkRow;
  mode: string;
  exactSectionMatch: boolean;
}): number {
  const lowerQuestion = String(args.question || "").toLowerCase();
  const searchable = [
    String(args.row.section_number || ""),
    String(args.row.section || ""),
    String(args.row.topic || ""),
    String(args.row.first_sentence || ""),
    String(args.row.content || "").slice(0, 800),
    parseTags(args.row.tags).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let score =
    args.mode === "exact" ? 70 :
    args.mode === "fts" ? 42 :
    args.mode === "like" ? 28 :
    24;

  if (args.exactSectionMatch) score += 18;

  const keywordHits = extractQuestionKeywords(args.question).filter((keyword) =>
    searchable.includes(keyword)
  ).length;
  if (keywordHits >= 1) score += 10;
  if (keywordHits >= 2) score += 8;
  if (keywordHits >= 4) score += 4;

  for (const phrase of getBoostPhrases(args.question)) {
    if (!phrase) continue;
    if (searchable.includes(phrase)) score += 12;
  }

  if (/\?$/.test(lowerQuestion) && String(args.row.first_sentence || "").trim()) {
    score += 4;
  }

  return Math.max(0, Math.min(100, score));
}

function buildHybridPiece(
  row: HybridChunkRow,
  question: string,
  mode: string
): Piece {
  const sectionText = `${String(row.section_number || "")} ${String(row.section || "")}`.toLowerCase();
  const sectionRef = extractSectionReference(question);
  const exactSectionMatch = !!sectionRef && sectionText.includes(sectionRef);
  const headingText = normalizePhraseText(
    [
      String(row.section || ""),
      String(row.topic || ""),
      String(row.first_sentence || ""),
    ].join(" ")
  );
  const exactHeadingMatch = getBoostPhrases(question).some(
    (phrase) => phrase.length >= 3 && headingText.includes(normalizePhraseText(phrase))
  );
  const tags = parseTags(row.tags);
  const score = computeHybridPieceScore({
    question,
    row,
    mode,
    exactSectionMatch: exactSectionMatch || exactHeadingMatch,
  });

  return {
    sourceType: "vector",
    sourceId: String(row.chunk_id || ""),
    score,
    rawScore: Math.max(0.01, Math.min(1, score / 100)),
    title: String(row.section || row.topic || row.first_sentence || "").trim(),
    section: String(row.section_number || row.section || "").trim(),
    text: String(row.content || "").trim(),
    meta: {
      fileId: row.file_id || null,
      tags,
      section_number: row.section_number || null,
      first_sentence: row.first_sentence || null,
      __origin: "local_hybrid",
      __hybridMode: mode,
      __exactSectionMatch: exactSectionMatch || exactHeadingMatch,
      __exactHeadingMatch: exactHeadingMatch,
      __phraseBoosted: getBoostPhrases(question).some((phrase) =>
        normalizePhraseText(
          [
            String(row.section || ""),
            String(row.topic || ""),
            String(row.first_sentence || ""),
            String(row.content || ""),
            tags.join(" "),
          ].join(" ")
        ).includes(normalizePhraseText(phrase))
      ),
    },
  };
}

function scoreLocalPieceForFusion(piece: Piece, question: string): number {
  let score = Number(piece.score || 0);
  const lowerText = [
    String(piece.title || ""),
    String(piece.section || ""),
    String(piece.text || "").slice(0, 700),
  ]
    .join(" ")
    .toLowerCase();

  const keywords = extractQuestionKeywords(question);
  const keywordHits = keywords.filter((keyword) => lowerText.includes(keyword)).length;
  const exactSectionMatch = piece?.meta?.__exactSectionMatch === true;
  const phraseBoost = piece?.meta?.__phraseBoosted === true;
  const hybridOrigin = piece?.meta?.__origin === "local_hybrid";
  const shortText = String(piece.text || "").length < 80;

  if (exactSectionMatch) score += 18;
  if (phraseBoost) score += 12;
  if (keywordHits >= 1) score += 8;
  if (keywordHits >= 2) score += 8;
  if (keywordHits >= 4) score += 4;
  if (hybridOrigin) score += 2;
  if (shortText) score -= 10;

  if (/table of contents|home page|about us|contact us|learn more/i.test(lowerText)) {
    score -= 18;
  }

  return score;
}

export async function retrieveLocalHybrid(
  db: D1Database,
  question: string,
  maxResults: number
): Promise<Piece[]> {
  const res = await chunkDb.hybridSearch(db, question, maxResults);

  return (res.all || []).map((row) =>
    buildHybridPiece(row as HybridChunkRow, question, String(res.used || "like"))
  );
}

export function extractCrossReferences(text: string): string[] {
  const references: string[] = [];
  const source = String(text || "");

  const lawMatches = source.match(/\b(?:NRS|NAC)\s+\d+(?:\.\d+)+\b/gi) || [];
  references.push(...lawMatches);

  const sectionMatches = source.match(/\bSection\s+\d+(?:\.\d+)*\b/gi) || [];
  references.push(...sectionMatches);

  const policyMatches = source.match(/\b(?:Policy|Ref|Doc|SKU)\s*#?\s*[A-Z0-9-]+/gi) || [];
  references.push(...policyMatches);

  return Array.from(new Set(references.map((r) => r.trim()))).slice(0, 5);
}

export async function expandCrossReferenceCitations(
  db: D1Database,
  pieces: Piece[],
  maxExpansion = 3
): Promise<Piece[]> {
  if (!pieces || !pieces.length) return pieces;

  const existingIds = new Set(pieces.map((p) => p.sourceId));
  const crossRefs = new Set<string>();

  for (const piece of pieces.slice(0, 4)) {
    const refs = extractCrossReferences(piece.text);
    for (const ref of refs) {
      crossRefs.add(ref);
    }
  }

  if (crossRefs.size === 0) return pieces;

  const expandedPieces: Piece[] = [...pieces];
  let added = 0;

  for (const ref of Array.from(crossRefs)) {
    if (added >= maxExpansion) break;
    try {
      const res = await chunkDb.lexicalSearch(db, {
        query: ref,
        terms: [ref],
        exactPhrases: [ref],
        maxResults: 2,
      });

      for (const row of res || []) {
        if (!existingIds.has(row.chunk_id) && added < maxExpansion) {
          existingIds.add(row.chunk_id);
          expandedPieces.push({
            sourceType: "vector",
            sourceId: row.chunk_id,
            score: 75,
            rawScore: 0.75,
            title: row.topic || row.first_sentence || ref,
            url: "",
            section: row.section || ref,
            text: row.content,
            meta: { __origin: "cross_reference_expansion", __referencedCode: ref },
          });
          added++;
        }
      }
    } catch {}
  }

  return expandedPieces;
}

export function fuseLocalEvidence(args: {
  question: string;
  vectorPieces: Piece[];
  hybridPieces: Piece[];
  finalMax: number;
}) {
  const merged = [...(args.vectorPieces || []), ...(args.hybridPieces || [])];
  const byKey = new Map<string, Piece>();

  for (const piece of merged) {
    const key = `${piece.sourceId}::${piece.url || ""}`;
    const existing = byKey.get(key);
    const candidateScore = scoreLocalPieceForFusion(piece, args.question);
    const existingScore = existing ? scoreLocalPieceForFusion(existing, args.question) : -Infinity;

    if (!existing || candidateScore > existingScore) {
      byKey.set(key, {
        ...piece,
        score: Math.max(piece.score || 0, Math.round(candidateScore)),
        rawScore: Math.max(piece.rawScore || 0, Math.min(1, candidateScore / 100)),
      });
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => scoreLocalPieceForFusion(b, args.question) - scoreLocalPieceForFusion(a, args.question))
    .slice(0, args.finalMax);
}

function extractQuestionKeywords(question: string): string[] {
  const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "from", "have", "what", "when",
    "where", "which", "who", "your", "about", "into", "how", "can", "are", "was", "were",
    "does", "did", "is", "a", "an", "to", "of", "in", "on", "or", "by", "at",
  ]);

  return Array.from(
    new Set(
      String(question || "")
        .toLowerCase()
        .match(/[a-z0-9.]{3,}/g) || []
    )
  ).filter((word) => !stopWords.has(word));
}

function extractSectionReference(question: string): string | null {
  const text = String(question || "").toLowerCase();
  const lawRef = text.match(/\b(?:nrs|nac)\s+\d+(?:\.\d+)+\b/);
  if (lawRef) return lawRef[0];

  const sectionRef = text.match(/\bsection\s+\d+(?:\.\d+)*\b/);
  return sectionRef ? sectionRef[0] : null;
}

export function assessLocalEvidenceStrength(args: {
  question: string;
  pieces: Piece[];
  rerankKept: number;
  rerankCoverage?: number | null;
}): LocalEvidenceAssessment {
  const pieces = args.pieces || [];
  const topScore = Number(pieces[0]?.score || 0);
  const avgScore = pieces.length
    ? Math.round(pieces.reduce((sum, p) => sum + Number(p.score || 0), 0) / pieces.length)
    : 0;

  const sectionRef = extractSectionReference(args.question);
  const focusPhrases = getBoostPhrases(args.question);
  const exactSectionMatch = pieces.some((piece) => {
    const haystack = normalizePhraseText(
      [
        String(piece.section || ""),
        String(piece.title || ""),
        String(piece.text || "").slice(0, 300),
      ].join(" ")
    );

    return (
      (!!sectionRef && haystack.includes(sectionRef)) ||
      focusPhrases.some((phrase) => phrase.length >= 3 && haystack.includes(normalizePhraseText(phrase)))
    );
  });

  const keywords = extractQuestionKeywords(args.question);
  const keywordHybridHits = pieces.slice(0, 5).reduce((count, piece) => {
    const haystack = [
      String(piece.title || ""),
      String(piece.section || ""),
      String(piece.text || "").slice(0, 500),
    ]
      .join(" ")
      .toLowerCase();

    const matchedKeywords = keywords.filter((keyword) => haystack.includes(keyword));
    return count + (matchedKeywords.length >= 2 ? 1 : 0);
  }, 0);
  const hybridHits = pieces.filter((piece) => piece?.meta?.__origin === "local_hybrid").length;
  const contentQuality = validateContentQuality(pieces);

  const reasons: string[] = [];
  if (exactSectionMatch) reasons.push("exact_section_match");
  if (keywordHybridHits > 0) reasons.push(`keyword_hits:${keywordHybridHits}`);
  if (hybridHits > 0) reasons.push(`hybrid_hits:${hybridHits}`);
  if (args.rerankKept > 0) reasons.push(`rerank_kept:${args.rerankKept}`);
  if (typeof args.rerankCoverage === "number") reasons.push(`rerank_coverage:${args.rerankCoverage}`);
  if (topScore >= 85) reasons.push("top_score_strong");
  if (avgScore >= 60) reasons.push("avg_score_strong");
  if (contentQuality.valid) reasons.push("content_quality_valid");

  const sufficient =
    pieces.length > 0 &&
    (
      (topScore >= 85 && (exactSectionMatch || keywordHybridHits > 0)) ||
      (exactSectionMatch && topScore >= 65) ||
      (keywordHybridHits >= 2 && topScore >= 70) ||
      (hybridHits >= 1 && keywordHybridHits >= 1 && topScore >= 68) ||
      (args.rerankKept >= 2 && topScore >= 65) ||
      (args.rerankKept === 1 && (topScore >= 90 || exactSectionMatch || keywordHybridHits >= 2)) ||
      ((args.rerankCoverage || 0) >= 65 && topScore >= 62 && contentQuality.valid)
    );

  return {
    sufficient,
    exactSectionMatch,
    keywordHybridHits,
    hybridHits,
    rerankKept: args.rerankKept,
    rerankCoverage: args.rerankCoverage ?? null,
    topScore,
    avgScore,
    contentQualityValid: contentQuality.valid,
    reasons,
  };
}

export function parseRerankKeepIds(raw: string, candidateCount: number): number[] {
  return parseRerankOutput(raw, candidateCount).keepIds;
}

export function parseRerankOutput(
  raw: string,
  candidateCount: number
): ParsedRerankOutput {
  const parsed = safeJsonParseWithObjectRecovery<{ keepIds?: unknown; coverage?: unknown }>(
    String(raw || ""),
    {}
  );

  const keepIdsRaw = Array.isArray(parsed.keepIds) ? parsed.keepIds : [];

  const keepIds = Array.from(
    new Set(
      keepIdsRaw
        .map((id) => Number(id))
        .filter(
          (id) => Number.isInteger(id) && id >= 1 && id <= candidateCount
        )
    )
  );

  const coverageValue = Number(parsed.coverage);
  const coverage = Number.isFinite(coverageValue)
    ? Math.max(0, Math.min(100, Math.round(coverageValue)))
    : null;

  return {
    keepIds,
    coverage,
  };
}

export async function rerankPiecesWithLLM(args: {
  chains: ReturnType<typeof buildChains>;
  question: string;
  pieces: Piece[];
  maxItems?: number;
  candidateLimit?: number;
}): Promise<LlmRerankResult> {
  const {
    chains,
    question,
    pieces,
    maxItems = 8,
    candidateLimit = pieces.length,
  } = args;

  const candidates = (pieces || []).slice(0, candidateLimit);

  if (!candidates.length) {
    return { kept: [], rawText: "" };
  }

  const numbered = candidates
    .map((p, i) => {
      const preview = String(p.text || "").slice(0, 1200);
      return [
        `ID=${i + 1}`,
        `TITLE=${p.title || ""}`,
        `SECTION=${p.section || ""}`,
        `URL=${p.url || ""}`,
        `SCORE=${p.score || 0}`,
        `TEXT=${preview}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const raw = await chains.rerank.invoke({
    question,
    evidence: numbered,
    maxItems: maxItems,
  } as any);

  const parsed = parseRerankOutput(String(raw || ""), candidates.length);
  const keepIds = parsed.keepIds;

  const kept = keepIds
    .map((id) => candidates[id - 1])
    .filter(Boolean);

  const fallbackKept = candidates.slice(0, Math.max(1, Math.min(maxItems, candidates.length)));

  let finalKept = kept.length ? kept.slice(0, maxItems) : fallbackKept;

  // Safety: If reranker over-filtered to fewer than 3 chunks, supplement with top candidates
  // so actual content chunks aren't lost if the reranker picked a Table of Contents/Heading chunk.
  if (finalKept.length < 3 && candidates.length > finalKept.length) {
    const existingIds = new Set(finalKept.map((p) => `${p.sourceType}::${p.sourceId}`));
    for (const c of candidates) {
      const key = `${c.sourceType}::${c.sourceId}`;
      if (!existingIds.has(key)) {
        finalKept.push(c);
        existingIds.add(key);
        if (finalKept.length >= Math.min(3, maxItems)) break;
      }
    }
  }

  return {
    kept: finalKept,
    rawText: String(raw || ""),
  };
}

export function evaluatePrimaryEvidence(
  pieces: Piece[],
  opts?: {
    minVectorScore?: number;
    minKeep?: number;
    validateContent?: boolean; // NEW: validate content quality before gating
  }
): PrimaryEvidenceGateResult {
  const minVectorScore = Number(opts?.minVectorScore ?? 35);
  const minKeep = Math.max(1, Number(opts?.minKeep ?? 1));
  const validateContent = opts?.validateContent !== false; // Default true

  const sourceFiltered = (pieces || []).filter((p) => p.sourceType === "vector");

  if (!sourceFiltered.length) {
    return {
      status: "rescue",
      reason: "no_primary_evidence",
      keptPieces: [],
      metrics: {
        count: 0,
        topScore: 0,
        avgScore: 0,
      },
    };
  }

  // NEW: Check content quality before proceeding
  const contentQuality = validateContent ? validateContentQuality(sourceFiltered) : { valid: true, issues: [] };
  if (!contentQuality.valid) {
    // Treat content validation failures as rescue trigger
    logger.warn("Evidence content validation failed", {
      issues: contentQuality.issues,
      count: sourceFiltered.length,
    });
    return {
      status: "rescue",
      reason: "low_primary_scores",
      keptPieces: sourceFiltered.slice(0, 3), // Keep top 3 anyway for fallback
      metrics: {
        count: sourceFiltered.length,
        topScore: Number(sourceFiltered[0]?.score || 0),
        avgScore: Math.round(
          sourceFiltered.reduce((sum, p) => sum + Number(p.score || 0), 0) /
            sourceFiltered.length
        ),
      },
    };
  }

  const strong = sourceFiltered.filter((p) => Number(p.score || 0) >= minVectorScore);
  const topScore = Number(sourceFiltered[0]?.score || 0);
  const avgScore =
    sourceFiltered.length > 0
      ? Math.round(
          sourceFiltered.reduce((sum, p) => sum + Number(p.score || 0), 0) /
            sourceFiltered.length
        )
      : 0;

  if (strong.length < minKeep) {
    return {
      status: "rescue",
      reason: "low_primary_scores",
      keptPieces: strong,
      metrics: {
        count: sourceFiltered.length,
        topScore,
        avgScore,
      },
    };
  }

  return {
    status: "pass",
    reason: "enough_evidence",
    keptPieces: strong,
    metrics: {
      count: sourceFiltered.length,
      topScore,
      avgScore,
    },
  };
}

export function isFallbackAnswer(answer: string, fallbackMessage: string) {
  const a = normalizeForFallbackCompare(answer);
  const f = normalizeForFallbackCompare(fallbackMessage);

  if (!a) return true;
  if (a === f) return true;

  const fallbackSignals = [
    "i am sorry - i do not have enough information to answer that",
    "im sorry - i do not have enough information to answer that",
    "im sorry - i dont have enough information to answer that",
    "i am sorry - i dont have enough information to answer that",
    "i do not have enough information to answer that",
    "i dont have enough information to answer that",
    "not enough information to answer that",
  ].map(normalizeForFallbackCompare);

  return fallbackSignals.includes(a);
}

export function classifyAnswerQuality(
  answer: string,
  fallbackMessage: string
): AnswerQuality {
  if (isFallbackAnswer(answer, fallbackMessage)) {
    return "fallback";
  }

  const lower = String(answer || "").toLowerCase().trim();

  const weakSignals = [
    "i’m not sure",
    "i'm not sure",
    "i do not know",
    "i don't know",
    "cannot determine",
    "can't determine",
    "insufficient information",
    "unclear from the provided context",
    "based on the provided context i cannot",
  ];

  if (weakSignals.some((s) => lower.includes(s))) {
    return "weak";
  }

  return "good";
}

/* -------------------------------------------------------------------------- */
/*                             AUTORAG / AI SEARCH                            */
/* -------------------------------------------------------------------------- */

function pickCfApiToken(env: Env["Bindings"]) {
  const anyEnv = env as any;
  return String(
    anyEnv.CF_AUTORAG_TOKEN ||
      anyEnv.CF_AI_SEARCH_TOKEN ||
      anyEnv.CF_SEARCH_AI_API_TOKEN ||
      anyEnv.CF_API_TOKEN ||
      ""
  ).trim();
}

function buildCfHeaders(env: Env["Bindings"]) {
  const token = pickCfApiToken(env);
  if (!token) {
    throw new Error("autorag: missing CF token (CF_AUTORAG_TOKEN / CF_API_TOKEN etc.)");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function retrieveAutoragWebAI(
  env: Env["Bindings"],
  enabled: boolean,
  ragName: string,
  query: string,
  topK: number,
  traceId: string,
  opts?: {
    scoreThreshold01?: number;
    model?: string;
    rewriteQuery?: boolean;
    rerankEnabled?: boolean;
    rerankModel?: string;
  }
): Promise<{ pieces: Piece[]; reason: RetrieveReason }> {
  if (!enabled) return { pieces: [], reason: "disabled" };

  const accountId = String((env as any).CF_ACCOUNT_ID || "").trim();
  const rag = String(ragName || "").trim();

  if (!accountId || !rag) {
    return { pieces: [], reason: "disabled" };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/autorag/rags/${encodeURIComponent(
    rag
  )}/ai-search`;

  const body: any = {
    query: String(query || ""),
    max_num_results: Math.max(1, Math.min(50, Number(topK) || 10)),
    ranking_options: { score_threshold: 0 },
  };

  if (opts?.model) body.model = String(opts.model);
  if (typeof opts?.rewriteQuery === "boolean") body.rewrite_query = !!opts.rewriteQuery;
  if (typeof opts?.rerankEnabled === "boolean") body.reranking = { enabled: !!opts.rerankEnabled };
  if (opts?.rerankModel) body.rerank_model = String(opts.rerankModel);

  const t0 = now();

  logger.info("autorag:fetch_start", {
    rag,
    traceId,
    topK: body.max_num_results,
    model: body.model || "",
    rewrite_query: body.rewrite_query || false,
  });

  try {
    const res = await timeout(
      fetch(url, {
        method: "POST",
        headers: buildCfHeaders(env),
        body: JSON.stringify(body),
      }),
      20000,
      "autorag_fetch"
    );

    const txt = await res.text();

    if (!res.ok) {
      logger.warn("autorag:http_error", {
        status: res.status,
        body: safeStr(txt, 1400),
        rag,
        traceId,
        ms: now() - t0,
      });
      return { pieces: [], reason: "error" };
    }

    let json: any = null;
    try {
      json = JSON.parse(txt);
    } catch {
      logger.warn("autorag:json_parse_failed", { rag, traceId, ms: now() - t0 });
      return { pieces: [], reason: "error" };
    }

    const responseText = String(json?.result?.response || "").trim();
    if (!responseText) {
      logger.info("autorag:empty_response", { rag, traceId, ms: now() - t0 });
      return { pieces: [], reason: "ok" };
    }

    const pieces: Piece[] = [
      {
        sourceType: "autorag_response",
        sourceId: `autorag:${rag}:${traceId}`,
        score: 50,
        rawScore: 0.5,
        title: "AutoRAG Response",
        text: responseText,
        meta: {
          __origin: "autorag",
          __rag: rag,
          __traceId: traceId,
          responseOnly: true,
          __ms: now() - t0,
        },
      },
    ];

    logger.info("autorag:fetch_ok_response_only", {
      rag,
      traceId,
      ms: now() - t0,
      chars: responseText.length,
    });

    return { pieces, reason: "ok" };
  } catch (e: any) {
    logger.warn("autorag:fetch_failed", {
      err: String(e?.message || e),
      rag,
      traceId,
      ms: now() - t0,
    });
    return { pieces: [], reason: "error" };
  }
}

export async function retrieveAutoragWebAIV2(
  env: Env["Bindings"],
  enabled: boolean,
  instanceName: string,
  query: string,
  topK: number,
  traceId: string,
  opts?: {
    scoreThreshold01?: number;
    model?: string;
    rewriteQuery?: boolean;
    rerankEnabled?: boolean;
    rerankModel?: string;
  }
): Promise<{ pieces: Piece[]; reason: RetrieveReason }> {
  if (!enabled) return { pieces: [], reason: "disabled" };

  const accountId = String((env as any).CF_ACCOUNT_ID || "").trim();
  const instance = String(instanceName || "").trim();

  if (!accountId || !instance) {
    return { pieces: [], reason: "disabled" };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${encodeURIComponent(
    instance
  )}/chat/completions`;

  const body: any = {
    messages: [
      {
        role: "user",
        content: String(query || ""),
      },
    ],
    ai_search_options: {
      retrieval: {
        max_num_results: Math.max(1, Math.min(50, Number(topK) || 10)),
        match_threshold:
          typeof opts?.scoreThreshold01 === "number"
            ? Math.max(0, Math.min(1, Number(opts.scoreThreshold01)))
            : 0.4,
      },
      reranking: {
        enabled: !!opts?.rerankEnabled,
      },
    },
  };

  if (opts?.model) body.model = String(opts.model);
  if (typeof opts?.rewriteQuery === "boolean") {
    body.rewrite_query = !!opts.rewriteQuery;
  }
  if (opts?.rerankModel) {
    body.rerank_model = String(opts.rerankModel);
  }

  const t0 = now();

  logger.info("ai_search:fetch_start", {
    instance,
    traceId,
    topK: body.ai_search_options?.retrieval?.max_num_results,
    threshold: body.ai_search_options?.retrieval?.match_threshold,
    model: body.model || "",
    rewrite_query: body.rewrite_query || false,
    rerank_enabled: body.ai_search_options?.reranking?.enabled || false,
  });

  try {
    const res = await timeout(
      fetch(url, {
        method: "POST",
        headers: buildCfHeaders(env),
        body: JSON.stringify(body),
      }),
      20000,
      "ai_search_fetch"
    );

    const txt = await res.text();

    if (!res.ok) {
      logger.warn("ai_search:http_error", {
        status: res.status,
        body: safeStr(txt, 1400),
        instance,
        traceId,
        ms: now() - t0,
      });
      return { pieces: [], reason: "error" };
    }

    let json: any = null;
    try {
      json = JSON.parse(txt);
    } catch {
      logger.warn("ai_search:json_parse_failed", {
        instance,
        traceId,
        ms: now() - t0,
      });
      return { pieces: [], reason: "error" };
    }

    const responseText = String(json?.choices?.[0]?.message?.content || "").trim();
    const chunks = Array.isArray(json?.chunks) ? json.chunks : [];

    if (!responseText) {
      logger.info("ai_search:empty_response", {
        instance,
        traceId,
        chunkCount: chunks.length,
        ms: now() - t0,
      });
      return { pieces: [], reason: "error" };
    }

    const pieces: Piece[] = [
      {
        sourceType: "autorag_response",
        sourceId: `ai-search:${instance}:${traceId}`,
        score: 50,
        rawScore: 0.5,
        title: "AI Search Response",
        text: responseText,
        meta: {
          __origin: "ai_search",
          __instance: instance,
          __traceId: traceId,
          __ms: now() - t0,
          __chunkCount: chunks.length,
          __chunks: chunks,
          __usage: json?.usage || null,
          __model: json?.model || body.model || null,
        },
      },
    ];

    logger.info("ai_search:fetch_ok_response_only", {
      instance,
      traceId,
      ms: now() - t0,
      chars: responseText.length,
      chunkCount: chunks.length,
    });

    return { pieces, reason: "ok" };
  } catch (e: any) {
    logger.warn("ai_search:fetch_failed", {
      err: String(e?.message || e),
      instance,
      traceId,
      ms: now() - t0,
    });
    return { pieces: [], reason: "error" };
  }
}

export async function runAutoragRescue(
  env: Env["Bindings"],
  params: {
    enabled: boolean;
    instanceName: string;
    query: string;
    topK: number;
    traceId: string;
    fallbackMessage: string;
    opts?: {
      scoreThreshold01?: number;
      model?: string;
      rewriteQuery?: boolean;
      rerankEnabled?: boolean;
      rerankModel?: string;
    };
  }
): Promise<AutoragRescueNormalized> {
  const res = await retrieveAutoragWebAIV2(
    env,
    params.enabled,
    params.instanceName,
    params.query,
    params.topK,
    params.traceId,
    params.opts
  );

  const answer = String(res.pieces?.[0]?.text || "").trim();

  if (!answer) {
    return {
      ok: false,
      answer: params.fallbackMessage,
      reason: res.reason === "ok" ? "empty" : res.reason,
      pieces: res.pieces || [],
      meta: {
        rawReason: res.reason,
      },
    };
  }

  return {
    ok: true,
    answer,
    reason: res.reason,
    pieces: res.pieces || [],
    meta: {
      rawReason: res.reason,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                              CLARIFY / HELPERS                             */
/* -------------------------------------------------------------------------- */

export function getClarifyOptions(env: Env["Bindings"], domainHint: string) {
  const anyEnv = env as any;
  const fromEnv = String(anyEnv.CLARIFY_OPTIONS || "").trim();
  if (fromEnv) return fromEnv;

  const base = ["services", "pricing", "billing", "account", "support request", "contact info"];

  const d = String(domainHint || "").toLowerCase();
  const extra =
    d.includes("hoa") || d.includes("community") || d.includes("association")
      ? ["maintenance", "board meeting", "documents"]
      : [];

  return [...base, ...extra].join(", ");
}

/* -------------------------------------------------------------------------- */
/*                                  PERSIST                                   */
/* -------------------------------------------------------------------------- */

export async function persist(
  db: D1Database,
  userId: string,
  threadId: string,
  question: string,
  answer: string,
  context: string,
  tokensUsed: number,
  status: PersistStatus | boolean,
  traceJson?: string
): Promise<number | null> {
  try {
    await threaddb.saveThreadToDatabase(db, userId, threadId);
  } catch (e) {
    logger.warn("persist:thread", { err: String(e), threadId, userId });
  }

  let messageId: number | null = null;

  const statusCode =
    status === true || status === "success"
      ? 1
      : status === "degraded"
      ? 2
      : 0;

  try {
    const rawId = await messagesdb.saveMessageToDatabase(
      db,
      threadId,
      userId,
      String(question ?? ""),
      String(answer ?? ""),
      String(context ?? ""),
      Number(tokensUsed ?? 0),
      statusCode
    );

    const parsedId =
      typeof rawId === "number"
        ? rawId
        : typeof rawId === "string"
        ? Number(rawId)
        : null;

    messageId = Number.isFinite(parsedId as any) ? (parsedId as any) : null;
  } catch (e) {
    logger.error("persist:message", { err: String(e), threadId, userId });
    return null;
  }

  if (traceJson && messageId !== null) {
    try {
      await messageTracesDb.save(db, {
        threadId,
        userId,
        messageId: String(messageId),
        message: String(question ?? ""),
        traceJson: String(traceJson),
      });
    } catch (e) {
      logger.warn("persist:trace_failed", {
        err: String(e),
        threadId,
        userId,
        messageId,
      });
    }
  }

  // Phase 8: Trigger rolling conversation summary update in background
  updateRollingThreadSummary(db, threadId).catch(() => {});

  return messageId;
}

/**
 * Phase 8: Rolling Thread Summarization
 */
export async function updateRollingThreadSummary(
  db: D1Database,
  threadId: string
): Promise<void> {
  try {
    const messages = await threaddb.getMessagesForThread(db, threadId);
    if (!messages || messages.length < 3) return;

    // Key facts extraction from past turns
    const userFacts: string[] = [];
    for (const m of messages) {
      const q = String(m.question || "");
      const nameMatch = q.match(/(?:my name is|i am|call me)\s+([a-z0-9_\-\s]{2,30})/i);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1].replace(/(?:and|im|from|years|old).*/i, "").trim();
        if (name && name.length > 1) userFacts.push(`User's name is ${name}`);
      }
      const locationMatch = q.match(/(?:from|living in|located in)\s+([a-z0-9_\-\s]{2,30})/i);
      if (locationMatch && locationMatch[1]) {
        userFacts.push(`User location: ${locationMatch[1].trim()}`);
      }
    }

    const topics = Array.from(
      new Set(
        messages
          .map((m: any) => String(m.question || "").match(/NRS\s*624\.\d+/gi) || [])
          .flat()
      )
    );

    const summaryParts = [...Array.from(new Set(userFacts))];
    if (topics.length > 0) summaryParts.push(`Topics discussed: ${topics.join(", ")}`);

    if (summaryParts.length > 0) {
      await threaddb.updateThreadSummary(db, threadId, summaryParts.join(" | "));
    }
  } catch (err: any) {
    console.warn("updateRollingThreadSummary warning:", err.message);
  }
}

