/**
 * ask.controller.ts (Refactored)
 *
 * HTTP request handlers for /ask and /ask/stream endpoints.
 *
 * Both endpoints use the shared preparation → retrieval → execution pipeline:
 * 1. preparePipeline: Input validation, threading, preflight, direct routes
 * 2. retrievePipeline: Vector retrieval with intelligent retry logic
 * 3. executePipeline: Final answer generation + rescue
 * 4. SSE formatting: stream the final executed answer
 *
 * This ensures both endpoints use identical retrieval and preparation logic.
 */

import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { Env } from "../types/env";

import { preparePipeline } from "../pipeline/ask.prepare";
import { retrievePipeline } from "../pipeline/ask.retrieve";
import { executePipeline } from "../pipeline/ask.execute";

import { createSSEResponse, formatSSEDoneEvent, formatSSEErrorEvent, formatSSEMetaEvent, formatSSETokenEvent } from "../utils/sse-stream";
import { now, persist } from "../utils/ask-helper";
import { traceStepEnd, finalizeTrace, traceLogFinalContextDetail } from "../utils/trace";
import { fallbackDb } from "../services/db/fallback.db";
import type { D1Database } from "@cloudflare/workers-types";

import {
  getCachedQueryResponse,
  saveQueryResponseToCache,
  getSemanticCacheHit,
  saveSemanticCacheEntry,
  generateSha256Hash,
  normalizeQuery,
} from "../services/cache.service";

const STOP_WORDS_SET = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could",
  "did", "do", "does", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "has",
  "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into",
  "is", "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on",
  "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
  "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
  "solar", "energy", "information", "questions", "question", "assistance", "direct", "directly", "contact", "feel", "free", "ask"
]);

function getDistinctWords(text: string): Set<string> {
  if (!text) return new Set();
  const words = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS_SET.has(w));
  return new Set(words);
}

function formatRetrievedSources(
  pieces: any[],
  answerText?: string
): Array<{ fileName: string; section: string; topic?: string; score: number | null; isWeb?: boolean; url?: string }> {
  if (!Array.isArray(pieces) || !pieces.length) return [];

  // Filter pieces by answer token overlap if answerText is provided
  let activePieces = pieces;
  if (answerText && answerText.trim().length > 0) {
    const answerWords = getDistinctWords(answerText);
    const scoredPieces = pieces.map((p) => {
      const rawFileName = p.file_name || p.meta?.file_name || p.fileName || "";
      const content = p.content || p.text || p.meta?.content || "";
      const topic = p.topic || p.meta?.topic || "";

      const contentWords = getDistinctWords(content + " " + rawFileName + " " + topic);
      let matchCount = 0;
      for (const w of contentWords) {
        if (answerWords.has(w)) {
          matchCount++;
        }
      }
      return { piece: p, matchCount };
    });

    const matched = scoredPieces.filter((sp) => sp.matchCount >= 2).map((sp) => sp.piece);
    if (matched.length > 0) {
      activePieces = matched;
    } else {
      activePieces = [pieces[0]];
    }
  }

  const docMap = new Map<string, any>();

  for (const p of activePieces) {
    const rawFileName =
      p.file_name ||
      p.meta?.file_name ||
      p.fileName ||
      p.meta?.fileName ||
      (typeof p.meta?.file_path === "string" ? p.meta.file_path.split("/").pop() : null) ||
      (typeof p.file_path === "string" ? p.file_path.split("/").pop() : null);

    let fileName = rawFileName ? String(rawFileName).trim() : "Knowledge Source";

    const isWeb = Boolean(
      p.file_id?.startsWith("web_") ||
      p.meta?.file_id?.startsWith("web_") ||
      p.file_path?.startsWith("http") ||
      p.meta?.file_path?.startsWith("http") ||
      p.url?.startsWith("http") ||
      p.meta?.url?.startsWith("http") ||
      p.source === "web" ||
      p.meta?.source === "web" ||
      (fileName !== "Knowledge Source" && !fileName.includes("."))
    );

    const url = p.file_path?.startsWith("http")
      ? p.file_path
      : p.meta?.file_path?.startsWith("http")
      ? p.meta.file_path
      : p.url || p.meta?.url || null;

    let rawScore = typeof p.score === "number" ? p.score : 0;
    let scoreInt = rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100);
    if (scoreInt > 100) scoreInt = 100;

    const section = p.section || p.meta?.section || p.meta?.section_number || "";
    const topic = p.topic || p.meta?.topic || "";

    if (!docMap.has(fileName) || scoreInt > (docMap.get(fileName).score || 0)) {
      docMap.set(fileName, {
        fileName,
        section,
        topic,
        score: scoreInt > 0 ? scoreInt : null,
        isWeb,
        url,
      });
    }
  }

  return Array.from(docMap.values());
}

function buildFinalResponse(args: {
  ok: boolean;
  threadId: string;
  route: string;
  answer: string;
  outcome: string;
  tokensUsed: number;
  source: string;
  meta?: Record<string, any>;
  sources?: any[];
}) {
  return {
    ok: args.ok,
    threadId: args.threadId,
    route: args.route,
    answer: args.answer,
    outcome: args.outcome,
    usage: {
      tokensUsed: args.tokensUsed,
    },
    meta: args.meta || {},
    sources: args.sources || [],
  };
}

function logError(label: string, error: any, context?: Record<string, any>) {
  console.error(
    JSON.stringify({
      level: "ERROR",
      label,
      error: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
      ...(context || {}),
    })
  );
}

type SharedAskSuccess = {
  ok: true;
  threadId: string;
  route: string;
  answer: string;
  outcome: string;
  tokensUsed: number;
  source: string;
  meta?: Record<string, any>;
  sources?: any[];
  startedAt: number;
};

type SharedAskFailure = {
  ok: false;
  status: StatusCode;
  error: string;
};

function chunkTextForSSE(text: string, chunkSize = 32) {
  const source = String(text || "");
  if (!source) return [];

  const chunks: string[] = [];
  for (let i = 0; i < source.length; i += chunkSize) {
    chunks.push(source.slice(i, i + chunkSize));
  }
  return chunks;
}

async function persistDirectRoute(args: {
  c: Context<Env>;
  userId: string;
  threadId: string;
  message: string;
  answer: string;
  tokensUsed: number;
  trace: any;
}) {
  const { c, userId, threadId, message, answer, tokensUsed, trace } = args;

  const db = c.env.DB as unknown as D1Database;
  const keepDev = true;
  const finalTrace = finalizeTrace(trace, keepDev);

  c.executionCtx.waitUntil(
    persist(
      db,
      userId,
      threadId,
      message,
      answer,
      "",
      tokensUsed,
      true,
      JSON.stringify(finalTrace)
    ).catch((e) => {
      logError("persist_failed", e, { userId, threadId });
    })
  );
}

async function runSharedAskLogic(
  c: Context<Env>,
  payload: any
): Promise<SharedAskSuccess | SharedAskFailure> {
  const startedAt = now();
  const rawMessage = String(payload?.message || payload?.question || "").trim();
  const userId = String(payload?.userId || "anonymous").trim();

  /* ------------------------------------------------------------------ */
  /* FAST-PATH CACHE CHECK: Layer 1 (KV Exact Match)                     */
  /* Executed BEFORE LLM Preflight & Embedding for sub-15ms response!   */
  /* ------------------------------------------------------------------ */
  if (c.env.CACHE && rawMessage && !payload?.bypassCache) {
    try {
      const cached = await getCachedQueryResponse(c.env.CACHE, rawMessage);
      if (cached) {
        const threadId = String(payload?.threadId || `${userId}_${new Date().toISOString().slice(0, 10)}_${Math.random().toString(36).slice(2, 8)}`).trim();
        console.log(JSON.stringify({ level: "INFO", label: "fast_cache_hit_L1_exact", latencyMs: cached.latencyMs, query: rawMessage.slice(0, 80) }));

        const db = c.env.DB as unknown as D1Database;
        if (db) {
          c.executionCtx.waitUntil(
            persist(db, userId, threadId, rawMessage, cached.answer, cached.context || "", 0, true, "{}")
              .catch((e) => logError("persist_fast_cache_hit_failed", e))
          );
        }

        return {
          ok: true,
          threadId,
          route: "ANSWER_WITH_RAG",
          answer: cached.answer,
          outcome: "local_rag_success",
          tokensUsed: 0,
          source: "cache_L1_exact",
          startedAt,
          meta: { cacheHit: true, cacheLayer: "L1_KV_EXACT", cacheLatencyMs: cached.latencyMs },
        };
      }
    } catch (e: any) {
      logError("fast_cache_L1_check_failed", e);
    }
  }

  const prep = await preparePipeline(c, payload);

  if (!prep.ok) {
    console.error("[ask] Prepare failed:", prep.error);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: prep.error || "Preparation failed",
    };
  }

  if (prep.directRoute) {
    traceStepEnd(prep.trace, "final_execution", 0, {
      source: "direct_route",
      route: prep.route,
      ok: true,
      tokensUsed: prep.directRoute.tokensUsed,
    });

    await persistDirectRoute({
      c,
      userId: prep.userId,
      threadId: prep.threadId,
      message: prep.message,
      answer: prep.directRoute.answer,
      tokensUsed: prep.directRoute.tokensUsed,
      trace: prep.trace,
    });

    const isDirectFallback =
      (prep.route as string) === "OUT_OF_SCOPE" ||
      prep.directRoute.answer.includes("I'm sorry") ||
      prep.directRoute.answer.includes("I’m sorry") ||
      prep.directRoute.answer.includes("can't assist") ||
      prep.directRoute.answer.includes("can’t assist") ||
      prep.directRoute.answer.includes("don't have");

    if (isDirectFallback) {
      await fallbackDb.logFallbackQuery(c.env.DB, {
        query: prep.message || prep.query || "",
        threadId: prep.threadId,
        userId: prep.userId,
        reason: prep.route || "direct_out_of_scope"
      });
    }

    return {
      ok: true,
      threadId: prep.threadId,
      route: prep.route,
      answer: prep.directRoute.answer,
      outcome: "direct_route",
      tokensUsed: prep.directRoute.tokensUsed,
      source: "direct_route",
      startedAt: prep.startedAt,
    };
  }

  /* ------------------------------------------------------------------ */
  /* CACHE CHECK: Layer 2 (Semantic Vectorize Similarity >= 0.95)         */
  /* ------------------------------------------------------------------ */

  const cacheQuery = prep.query || prep.message;

  // Layer 2: Semantic Vectorize Similarity (>= 0.95 cosine)
  if (c.env.VECTORIZE_CACHE && c.env.CACHE && prep.embedding) {
    try {
      const semHit = await getSemanticCacheHit(c.env.VECTORIZE_CACHE, prep.embedding, c.env.CACHE, cacheQuery);
      if (semHit.hit && semHit.answer) {
        console.log(JSON.stringify({ level: "INFO", label: "cache_hit_L2_semantic", score: semHit.score, latencyMs: semHit.latencyMs, query: cacheQuery.slice(0, 80) }));
        traceStepEnd(prep.trace, "cache_hit", semHit.latencyMs || 0, { layer: "L2_SEMANTIC", score: semHit.score });

        const db = c.env.DB as unknown as D1Database;
        c.executionCtx.waitUntil(
          persist(db, prep.userId, prep.threadId, prep.message, semHit.answer, "", 0, true, JSON.stringify(finalizeTrace(prep.trace, true)))
            .catch((e) => logError("persist_cache_hit_failed", e))
        );

        return {
          ok: true,
          threadId: prep.threadId,
          route: prep.route,
          answer: semHit.answer,
          outcome: "local_rag_success",
          tokensUsed: 0,
          source: "cache_L2_semantic",
          startedAt: prep.startedAt,
          meta: { cacheHit: true, cacheLayer: "L2_SEMANTIC", cacheScore: semHit.score, cacheLatencyMs: semHit.latencyMs },
        };
      }
    } catch (e: any) {
      logError("cache_L2_check_failed", e);
    }
  }

  /* ------------------------------------------------------------------ */
  /* CACHE MISS: Run full RAG pipeline (Layer 3)                         */
  /* ------------------------------------------------------------------ */

  let retrieve: Awaited<ReturnType<typeof retrievePipeline>>;
  try {
    retrieve = await retrievePipeline(
      c,
      prep.trace,
      prep.apiKey,
      prep.chains,
      prep.policy,
      prep.limits,
      prep.embedding,
      prep.query,
      prep.historyPreview
    );
  } catch (retrieveError: any) {
    console.error("[ask] Retrieve failed:", retrieveError?.message || retrieveError);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: `Retrieval stage failed: ${retrieveError?.message || "Unknown error"}`,
    };
  }

  traceLogFinalContextDetail(prep.trace, retrieve.status, retrieve.context, retrieve.pieces);

  const executed = await executePipeline({
    c,
    trace: prep.trace,
    policy: prep.policy,
    question: prep.query,
    threadId: prep.threadId,
    userId: prep.userId,
    context: retrieve.context,
    language: prep.language,
    historyPreview: prep.historyPreview,
    assistantName: prep.assistantName,
    domainHint: prep.domainHint,
    fallbackMessage: prep.fallbackMessage,
    chains: prep.chains,
    startedAt: prep.startedAt,
    localEvidence: retrieve.localEvidence,
  });

  /* ------------------------------------------------------------------ */
  /* CACHE WRITEBACK: Save to Layer 1 + Layer 2 on successful answer      */
  /* ------------------------------------------------------------------ */

  const isFallbackAnswer =
    executed.outcome === "final_fallback" ||
    executed.answer.includes("don't have enough information") ||
    executed.answer.includes("don't have specific information") ||
    executed.answer.includes("unable to find") ||
    executed.answer.includes("I’m sorry") ||
    executed.answer.includes("I'm sorry");

  if (isFallbackAnswer) {
    await fallbackDb.logFallbackQuery(c.env.DB, {
      query: prep.message || prep.query || "",
      threadId: prep.threadId,
      userId: prep.userId,
      reason: executed.outcome || "final_fallback"
    });
  }

  if (executed.ok && executed.outcome !== "final_fallback" && !isFallbackAnswer && c.env.CACHE && cacheQuery) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const cachePayload = {
            answer: executed.answer,
            context: retrieve.context || "",
            sources: retrieve.pieces?.map((p: any) => ({ section: p.section, score: p.score })) || [],
            tokensUsed: executed.tokensUsed,
          };

          // Writeback Layer 1: KV Exact (save under raw message AND rewritten query)
          if (prep.message) {
            await saveQueryResponseToCache(c.env.CACHE, prep.message, cachePayload);
          }
          if (prep.query && prep.query !== prep.message) {
            await saveQueryResponseToCache(c.env.CACHE, prep.query, cachePayload);
          }

          // Writeback Layer 2: Semantic Vectorize
          if (c.env.VECTORIZE_CACHE && prep.embedding) {
            const normalized = normalizeQuery(prep.message || prep.query);
            if (normalized.length > 3) {
              const hash = await generateSha256Hash(normalized);
              await saveSemanticCacheEntry(c.env.VECTORIZE_CACHE, c.env.CACHE, hash, prep.embedding, cachePayload);
            }
          }

          console.log(JSON.stringify({ level: "INFO", label: "cache_writeback_success", rawMsg: prep.message?.slice(0, 50), query: prep.query?.slice(0, 50) }));
        } catch (e: any) {
          console.warn(JSON.stringify({ level: "WARN", label: "cache_writeback_failed", error: e?.message }));
        }
      })()
    );
  }

  return {
    ok: true,
    threadId: prep.threadId,
    route: prep.route,
    answer: executed.answer,
    outcome: executed.outcome,
    tokensUsed: executed.tokensUsed,
    source: executed.source,
    startedAt: prep.startedAt,
    sources: formatRetrievedSources(retrieve?.pieces, executed.answer),
  };
}

type StreamingAskSuccess = {
  ok: true;
  prep: Awaited<ReturnType<typeof preparePipeline>>;
  retrieve?: Awaited<ReturnType<typeof retrievePipeline>>;
  cachedAnswer?: string;
  cacheLayer?: string;
};

type StreamingAskFailure = {
  ok: false;
  status: StatusCode;
  error: string;
};

async function runStreamingPreparation(
  c: Context<Env>,
  payload: any
): Promise<StreamingAskSuccess | StreamingAskFailure> {
  const rawMessage = String(payload?.message || payload?.question || "").trim();

  // Fast-path Layer 1 KV Exact Cache check BEFORE LLM Preflight
  if (c.env.CACHE && rawMessage && !payload?.bypassCache) {
    try {
      const cached = await getCachedQueryResponse(c.env.CACHE, rawMessage);
      if (cached) {
        console.log(JSON.stringify({ level: "INFO", label: "stream_fast_cache_hit_L1", latencyMs: cached.latencyMs }));
        const userId = String(payload?.userId || "anonymous").trim();
        const threadId = String(payload?.threadId || `${userId}_${new Date().toISOString().slice(0, 10)}_${Math.random().toString(36).slice(2, 8)}`).trim();
        
        const dummyPrep: any = {
          ok: true,
          userId,
          threadId,
          route: "ANSWER_WITH_RAG",
          message: rawMessage,
          startedAt: now(),
          trace: {},
        };
        return { ok: true, prep: dummyPrep, cachedAnswer: cached.answer, cacheLayer: "L1_KV_EXACT" };
      }
    } catch (e: any) {
      logError("stream_fast_cache_L1_failed", e);
    }
  }

  const prep = await preparePipeline(c, payload);

  if (!prep.ok) {
    return {
      ok: false,
      status: 400 as StatusCode,
      error: prep.error || "Preparation failed",
    };
  }

  if (prep.directRoute) {
    return { ok: true, prep };
  }

  // Layer 2: Semantic Vectorize Cache Check
  const cacheQuery = prep.query || prep.message;

  if (c.env.VECTORIZE_CACHE && c.env.CACHE && prep.embedding) {
    try {
      const semHit = await getSemanticCacheHit(c.env.VECTORIZE_CACHE, prep.embedding, c.env.CACHE, cacheQuery);
      if (semHit.hit && semHit.answer) {
        console.log(JSON.stringify({ level: "INFO", label: "stream_cache_hit_L2", score: semHit.score }));
        return { ok: true, prep, cachedAnswer: semHit.answer, cacheLayer: "L2_SEMANTIC" };
      }
    } catch (e: any) {
      logError("stream_cache_L2_failed", e);
    }
  }

  try {
    const retrieve = await retrievePipeline(
      c,
      prep.trace,
      prep.apiKey,
      prep.chains,
      prep.policy,
      prep.limits,
      prep.embedding,
      prep.query,
      prep.historyPreview
    );

    traceLogFinalContextDetail(prep.trace, retrieve.status, retrieve.context, retrieve.pieces);
    return { ok: true, prep, retrieve };
  } catch (retrieveError: any) {
    console.error("[ask/stream] Retrieve failed:", retrieveError?.message || retrieveError);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: `Retrieval stage failed: ${retrieveError?.message || "Unknown error"}`,
    };
  }
}

export const askController = {
  /**
   * Ask endpoint: /ask
   * Returns JSON response
   */
  ask: async (c: Context<Env>) => {
    let payload: any = {};
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const t0 = now();

    try {
      const result = await runSharedAskLogic(c, payload);

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            error: result.error,
          },
          result.status
        );
      }

      return c.json(
        buildFinalResponse({
          ok: true,
          threadId: result.threadId,
          route: result.route,
          answer: result.answer,
          outcome: result.outcome,
          tokensUsed: result.tokensUsed,
          source: result.source,
          meta: result.meta,
        }),
        200
      );
    } catch (err: any) {
      console.error("[ask] Controller error:", err?.message || err);
      return c.json(
        {
          ok: false,
          error: err?.message || "Ask request failed",
        },
        500 as StatusCode
      );
    }
  },

  /**
   * Streaming ask endpoint: /ask/stream
   * Returns SSE stream of answer tokens
   */
  askStream: async (c: Context<Env>) => {
    let payload: any = {};
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }

    try {
      const result = await runStreamingPreparation(c, payload);

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            error: result.error,
          },
          result.status
        );
      }

      const sseGenerator = async function* () {
        const prep = result.prep;
        try {
          yield formatSSEMetaEvent({
            threadId: prep.threadId,
            route: prep.route,
            ok: true,
            startedAt: prep.startedAt,
          });

          if (prep.directRoute) {
            let position = 0;
            for (const chunk of chunkTextForSSE(prep.directRoute.answer)) {
              yield formatSSETokenEvent({
                chunk,
                position,
              });
              position += chunk.length;
            }

            traceStepEnd(prep.trace, "final_execution", 0, {
              source: "direct_route",
              route: prep.route,
              ok: true,
              tokensUsed: prep.directRoute.tokensUsed,
            });

            await persistDirectRoute({
              c,
              userId: prep.userId,
              threadId: prep.threadId,
              message: prep.message,
              answer: prep.directRoute.answer,
              tokensUsed: prep.directRoute.tokensUsed,
              trace: prep.trace,
            });

            yield formatSSEDoneEvent({
              threadId: prep.threadId,
              route: prep.route,
              answer: prep.directRoute.answer,
              ok: true,
              tokensUsed: prep.directRoute.tokensUsed,
              timing: { ms: now() - prep.startedAt },
            });
            return;
          }

          // Handle cached answer (Layer 1 or Layer 2 cache hit)
          if (result.cachedAnswer) {
            let position = 0;
            for (const chunk of chunkTextForSSE(result.cachedAnswer)) {
              yield formatSSETokenEvent({
                chunk,
                position,
              });
              position += chunk.length;
            }

            // Persist cached answer into conversation history
            const db = c.env.DB as unknown as D1Database;
            c.executionCtx.waitUntil(
              persist(db, prep.userId, prep.threadId, prep.message, result.cachedAnswer, "", 0, true, JSON.stringify(finalizeTrace(prep.trace, true)))
                .catch((e) => logError("persist_stream_cache_hit_failed", e))
            );

            yield formatSSEDoneEvent({
              threadId: prep.threadId,
              route: prep.route,
              answer: result.cachedAnswer,
              ok: true,
              tokensUsed: 0,
              timing: { ms: now() - prep.startedAt },
            });
            return;
          }

          const retrieve = result.retrieve!;
          const executed = await executePipeline({
            c,
            trace: prep.trace,
            policy: prep.policy,
            question: prep.query,
            threadId: prep.threadId,
            userId: prep.userId,
            context: retrieve.context,
            language: prep.language,
            historyPreview: prep.historyPreview,
            assistantName: prep.assistantName,
            domainHint: prep.domainHint,
            fallbackMessage: prep.fallbackMessage,
            chains: prep.chains,
            startedAt: prep.startedAt,
            localEvidence: retrieve.localEvidence,
          });

          let answer = "";
          let position = 0;
          for (const chunk of chunkTextForSSE(executed.answer)) {
            answer += chunk;
            yield formatSSETokenEvent({
              chunk,
              position,
            });
            position += chunk.length;
          }

          // Asynchronously write back generated streaming answer to KV and Vectorize caches
          const isStreamingFallback = executed.answer.includes("I'm sorry, but I don't have specific information") || executed.answer.includes("I am unable to find");

          if (executed.outcome === "final_fallback" || isStreamingFallback) {
            await fallbackDb.logFallbackQuery(c.env.DB, {
              query: prep.message || prep.query || "",
              threadId: prep.threadId,
              userId: prep.userId,
              reason: executed.outcome || "final_fallback"
            });
          }

          c.executionCtx.waitUntil(
            (async () => {
              if (c.env.CACHE && executed.answer && executed.outcome !== "final_fallback" && !isStreamingFallback) {
                const cachePayload = {
                  answer: executed.answer,
                  context: retrieve?.context,
                  sources: retrieve?.pieces,
                  tokensUsed: executed.tokensUsed,
                };

                const rawMsg = prep.message;
                const rewrittenQuery = prep.query;

                await saveQueryResponseToCache(c.env.CACHE, rawMsg, cachePayload);

                if (rewrittenQuery && rewrittenQuery.toLowerCase().trim() !== rawMsg.toLowerCase().trim()) {
                  await saveQueryResponseToCache(c.env.CACHE, rewrittenQuery, cachePayload);
                }

                if (c.env.VECTORIZE_CACHE && prep.embedding) {
                  const hash = await generateSha256Hash(normalizeQuery(rewrittenQuery || rawMsg));
                  await saveSemanticCacheEntry(c.env.VECTORIZE_CACHE, c.env.CACHE, hash, prep.embedding, cachePayload, rawMsg);
                }

                console.log(JSON.stringify({ level: "INFO", label: "stream_cache_writeback_success", rawMsg, query: rewrittenQuery }));
              }

              // Persist full execution trace and message to D1 SQLite database
              const finalTraceJson = JSON.stringify(finalizeTrace(prep.trace, true));
              await persist(
                c.env.DB as any,
                prep.userId,
                prep.threadId,
                prep.message,
                answer,
                retrieve?.context || "",
                executed.tokensUsed || 0,
                true,
                finalTraceJson
              );
            })().catch((err) => logError("stream_persist_and_cache_failed", err))
          );

          yield formatSSEDoneEvent({
            threadId: prep.threadId,
            route: prep.route,
            answer,
            ok: true,
            tokensUsed: executed.tokensUsed,
            timing: { ms: now() - prep.startedAt },
            sources: formatRetrievedSources(retrieve?.pieces, answer),
          });
        } catch (streamError: any) {
          logError("stream_generation_error", streamError);

          yield formatSSEErrorEvent({
            message: streamError?.message || "Stream generation failed",
            ok: false,
            code: "STREAM_ERROR",
          });
        }
      };

      return createSSEResponse(sseGenerator(), 200);
    } catch (err: any) {
      console.error("[ask/stream] Controller error:", err?.message || err);
      return c.json(
        {
          ok: false,
          error: err?.message || "Ask stream request failed",
        },
        500 as StatusCode
      );
    }
  },

  purgeCache: async (c: Context<Env>) => {
    try {
      if (c.env.CACHE) {
        const { purgeAllQueryCache } = await import("../services/cache.service");
        await purgeAllQueryCache(c.env.CACHE);
        return c.json({ ok: true, message: "Purged query cache entries" });
      }
      return c.json({ ok: true, message: "No cache binding active" });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Cache purge failed" }, 500 as StatusCode);
    }
  },
};

// Export for fallback/legacy
export async function runDummyAsk(c: Context<Env>, payload: any) {
  return await askController.ask(c);
}
