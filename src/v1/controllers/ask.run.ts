// src/v1/controllers/ask.run.ts

import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../types/env";

import { buildPreflightChain } from "../utils/preflight-chain";
import { parsePreflight, type PreflightOut } from "../utils/preflight.parse";

import {
  FALLBACK_MESSAGE_DEFAULT,
  LIMITS,
  now,
  approxTokens,
  validateTokenLimit,
  timeout,
  normalizeLanguage,
  makeThreadId,
  buildChains,
  embedVector,
  retrieveVector,
  sortByScoreDesc,
  persist,
  buildPolicy,
  getRuntimeLimits,
  getClarifyOptions,
  retrieveAutoragWebAIV2,
  type Piece,
  type AskPolicy,
  dedupePiecesByKey,
  buildGroupedContextFromPieces,
  evaluatePrimaryEvidence,
  classifyAnswerQuality,
  rerankPiecesWithLLM,
} from "../utils/ask-helper";

import { messagesdb } from "../services/db/messages.db";
import { threaddb } from "../services/db/thread.db";

import {
  newTrace,
  traceSetRetrievalHits,
  traceSetFinalContext,
  traceSpan,
  traceStepStart,
  traceStepEnd,
  traceStepFail,
  finalizeTrace,
  type TraceShape,
} from "../utils/trace";

import {
  getCachedQueryResponse,
  saveQueryResponseToCache,
  getSemanticCacheHit,
  saveSemanticCacheEntry,
  generateSha256Hash,
  normalizeQuery,
} from "../services/cache.service";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

type Route =
  | "SMALL_TALK"
  | "LANGUAGE_MISMATCH"
  | "NEEDS_CLARIFICATION"
  | "ANSWER_WITH_RAG";

type FinalOutcome =
  | "local_rag_success"
  | "autorag_rescue_success"
  | "final_fallback";

type PrimaryAnswerResult = {
  answer: string;
  fallback: boolean;
  weak: boolean;
  error: boolean;
};

type RescueResult = {
  used: boolean;
  ok: boolean;
  answer: string;
  source: "autorag_rescue" | "fallback";
  reason:
    | "no_primary_evidence"
    | "low_primary_scores"
    | "primary_answer_fallback"
    | "primary_answer_weak"
    | "primary_answer_error"
    | "autorag_failed";
  rawPiecesCount: number;
  meta?: Record<string, any>;
};

/* -------------------------------------------------------------------------- */
/*                              SMALL LOCAL HELPERS                           */
/* -------------------------------------------------------------------------- */

function safeBool(v: any) {
  return v === true || String(v).toLowerCase() === "true";
}

function buildHistoryPreview(rows: Array<{ question?: string; answer?: string }>) {
  return rows
    .slice()
    .reverse()
    .map((m) => `User: ${m.question || ""}\nAssistant: ${m.answer || ""}`)
    .join("\n\n")
    .slice(0, LIMITS.historyPreviewChars);
}

function logStep(step: string, data?: any) {
  try {
    console.log(
      JSON.stringify({
        step,
        time: new Date().toISOString(),
        ...(data || {}),
      })
    );
  } catch {
    console.log(`[${step}]`, data);
  }
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

function buildFinalResponse(args: {
  ok: boolean;
  threadId: string;
  route: Route | "ANSWER_WITH_RAG";
  answer: string;
  outcome: FinalOutcome;
  tokensUsed: number;
  usedChunks: number;
  vectorUsed: number;
  autoragUsed: number;
  startedAt: number;
  meta?: Record<string, any>;
}) {
  return {
    ok: args.ok,
    threadId: args.threadId,
    route: args.route,
    answer: args.answer,
    outcome: args.outcome,

    usage: {
      tokensUsed: args.tokensUsed,
      usedChunks: args.usedChunks,
      usedBySource: {
        vector: args.vectorUsed,
        autorag_web: args.autoragUsed,
        autorag_response: args.autoragUsed,
      },
    },

    timing: {
      ms: now() - args.startedAt,
    },

    meta: args.meta || {},
  };
}

/* -------------------------------------------------------------------------- */
/*                           PRIMARY RETRIEVAL STAGE                          */
/* -------------------------------------------------------------------------- */

async function runPrimaryRetrievalStage(args: {
  c: Context<Env>;
  trace: TraceShape;
  apiKey: string;
  embedding: number[] | null;
  vecTopK: number;
}) {
  const { c, trace, apiKey, embedding, vecTopK } = args;

  const vectorRes = await traceSpan(
    trace,
    "retrieve_vector",
    async () => {
      if (!embedding?.length) return [];
      return await retrieveVector(c.env, apiKey, embedding, vecTopK);
    },
    { topK: vecTopK },
    (hits) => ({
      count: hits.length,
      topScore: hits[0]?.score ?? 0,
    })
  ).catch((e) => {
    logError("retrieve_vector_failed", e, { topK: vecTopK });
    traceStepFail(trace, "retrieve_vector", 0, e);
    return [] as Piece[];
  });

  traceSetRetrievalHits(trace, "vector", vectorRes);

  logStep("VECTOR_RESULTS", {
    count: vectorRes.length,
    topScore: vectorRes[0]?.score,
    sample: vectorRes[0]?.text?.slice(0, 200),
  });

  return vectorRes.sort(sortByScoreDesc);
}

function buildFinalPrimaryEvidence(args: {
  vectorPieces: Piece[];
  finalMax: number;
}) {
  const deduped = dedupePiecesByKey(args.vectorPieces || []);
  return deduped.slice(0, args.finalMax);
}

/* -------------------------------------------------------------------------- */
/*                            PRIMARY ANSWER STAGE                            */
/* -------------------------------------------------------------------------- */

async function runPrimaryAnswerStage(args: {
  trace: TraceShape;
  chains: ReturnType<typeof buildChains>;
  context: string;
  question: string;
  language: "english" | "spanish";
  historyPreview: string;
  assistantName: string;
  domainHint: string;
  fallbackMessage: string;
}): Promise<PrimaryAnswerResult> {
  const {
    trace,
    chains,
    context,
    question,
    language,
    historyPreview,
    assistantName,
    domainHint,
    fallbackMessage,
  } = args;

  try {
    const answer = await traceSpan(
      trace,
      "answer_primary",
      async () => {
        return await timeout(
          chains.answer.invoke({
            context,
            question,
            language,
            history: historyPreview,
            assistantName,
            domainHint,
            fallbackMessage,
          } as any),
          9500,
          "answer_primary"
        );
      },
      { timeoutMs: 9500 },
      (a) => ({
        answerChars: String(a || "").length,
      })
    );

    const quality = classifyAnswerQuality(answer, fallbackMessage);

    return {
      answer,
      fallback: quality === "fallback",
      weak: quality === "weak",
      error: false,
    };
  } catch (e: any) {
    logError("answer_primary_failed", e);
    traceStepFail(trace, "answer_primary", 0, e);

    return {
      answer: fallbackMessage,
      fallback: true,
      weak: false,
      error: true,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                              AUTORAG RESCUE STAGE                          */
/* -------------------------------------------------------------------------- */

async function runAutoragRescueStage(args: {
  c: Context<Env>;
  trace: TraceShape;
  policy: AskPolicy;
  question: string;
  threadId: string;
  startedAt: number;
  fallbackMessage: string;
  reason: RescueResult["reason"];
}): Promise<RescueResult> {
  const { c, trace, policy, question, threadId, startedAt, fallbackMessage, reason } = args;

  const rescue = await traceSpan(
    trace,
    "autorag_rescue",
    async () => {
      return await retrieveAutoragWebAIV2(
        c.env,
        policy.enableAutoragWeb,
        policy.autoragName,
        question,
        policy.autoragTopK,
        `${threadId}:${startedAt}:autorag_rescue`,
        {
          model: policy.autoragModel,
          rewriteQuery: policy.autoragRewriteQuery,
          rerankEnabled: policy.autoragRerankEnabled,
          rerankModel: policy.autoragRerankModel,
          scoreThreshold01: policy.autoragScoreThreshold01,
        }
      );
    },
    {
      enabled: policy.enableAutoragWeb,
      instance: policy.autoragName || null,
      reason,
    },
    (res) => ({
      count: res.pieces?.length || 0,
      reason: res.reason,
    })
  ).catch((e) => {
    logError("autorag_retrieve_failed", e, { question: question.slice(0, 100) });
    return { pieces: [], reason: "error" as const };
  });

  traceSetRetrievalHits(trace, "autorag_web", rescue.pieces || []);

  logStep("AUTORAG_RESCUE_RESULTS", {
    count: rescue.pieces?.length || 0,
    reason: rescue.reason,
    sample: rescue.pieces?.[0]?.text?.slice(0, 200),
  });

  const answer = String(rescue.pieces?.[0]?.text || "").trim();

  if (!answer) {
    return {
      used: true,
      ok: false,
      answer: fallbackMessage,
      source: "fallback",
      reason: "autorag_failed",
      rawPiecesCount: rescue.pieces?.length || 0,
      meta: {
        retrieveReason: rescue.reason,
      },
    };
  }

  return {
    used: true,
    ok: true,
    answer,
    source: "autorag_rescue",
    reason,
    rawPiecesCount: rescue.pieces?.length || 0,
    meta: {
      retrieveReason: rescue.reason,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                                  MAIN FLOW                                 */
/* -------------------------------------------------------------------------- */

export async function runAsk(
  c: Context<Env>,
  payload: any
): Promise<{ status: number; body: any }> {
  const t0 = now();

  const userId = String(payload?.userId || "").trim();
  const message = String(payload?.message || "").trim();
  const clientThreadId = payload?.threadId ? String(payload.threadId) : null;

  const language = normalizeLanguage(payload?.language);
  const debug = safeBool(payload?.debug);
  const onlySearch = safeBool(payload?.onlySearch);

  const assistantName = String(
    payload?.assistantName || c.env.ASSISTANT_NAME || "Assistant"
  ).trim();

  const domainHint = String(
    payload?.domainHint || c.env.ASSISTANT_DOMAIN_HINT || "Customer support."
  ).trim();

  const fallbackMessage = String(
    payload?.fallbackMessage || c.env.FALLBACK_MESSAGE || FALLBACK_MESSAGE_DEFAULT
  ).trim();

  if (!userId || !message) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "userId and message required",
      },
    };
  }

  const db = c.env.DB as unknown as D1Database;
  const apiKey = c.env.OPENAI_API_KEY;

  let threadId = clientThreadId || (await threaddb.getThreadIdForUser(db, userId));
  if (!threadId) {
    threadId = makeThreadId(userId, null);
  }

  const policyRaw = buildPolicy(c.env);
  const policy: AskPolicy = {
    ...policyRaw,
    enableWeb: false,
    enablePdf: false,
  };

  const lim = getRuntimeLimits(c.env);

  const trace: TraceShape = newTrace({
    userId,
    threadId,
    message,
    language,
    assistantName,
    domainHint,
    flags: { debug, onlySearch },
  });

  traceStepStart(trace, "request", {
    hasThreadId: !!clientThreadId,
    language,
    debug,
    onlySearch,
    assistantName,
    domainHint,
  });

  // logStep("REQUEST_START", {
  //   userId,
  //   threadId,
  //   message,
  //   language,
  //   debug,
  //   onlySearch,
  // });

  const enqueuePersist = (args: {
    answer: string;
    context: string;
    tokensUsed: number;
    ok: boolean;
    route: Route | "ANSWER_WITH_RAG";
  }) => {
    const keepDev = true;
    const finalTrace = finalizeTrace(trace, keepDev);

    c.executionCtx.waitUntil(
      persist(
        db,
        userId,
        threadId,
        message,
        args.answer,
        args.context,
        args.tokensUsed,
        args.ok,
        JSON.stringify(finalTrace)
      ).catch((e) => {
        logError("persist_failed", e, { userId, threadId });
      })
    );
  };

  try {
    traceStepEnd(trace, "request", now() - t0, { threadId });

    /* -------------------------------------------------------------------- */
    /* 1. HISTORY                                                           */
    /* -------------------------------------------------------------------- */

    const historyRows = await traceSpan(
      trace,
      "history_load",
      async () => {
        return await messagesdb.getLatestMessagesForThread(db, threadId, 6);
      },
      { take: 6 },
      (rows) => ({ rows: rows.length })
    ).catch((e) => {
      logError("history_load_failed", e, { threadId });
      traceStepFail(trace, "history_load", 0, e);
      return [];
    });

    const historyPreview = buildHistoryPreview(historyRows || []);

    traceStepEnd(trace, "history_preview", 0, {
      previewChars: historyPreview.length,
    });

    // logStep("HISTORY_LOADED", { count: historyRows.length });
    // logStep("HISTORY_PREVIEW", { preview: historyPreview.slice(0, 600) });

    /* -------------------------------------------------------------------- */
    /* 2. PREFLIGHT + SPECULATIVE EMBEDDING                                 */
    /* -------------------------------------------------------------------- */

    const preflightChain = buildPreflightChain(apiKey);

    // NEW: Track embeddings for potential reuse
    let lastEmbedding: number[] | null = null;
    let lastEmbeddingQuery = "";

    const preflightPromise = traceSpan(
      trace,
      "preflight",
      async () => {
        const pfRaw = await timeout(
          preflightChain.invoke({
            message,
            language,
            history: historyPreview,
            assistantName,
            domainHint,
            company: domainHint,
            brand: assistantName,
          } as any),
          6500,
          "preflight"
        );

        return parsePreflight(pfRaw);
      },
      { timeoutMs: 6500 }
    );

    const embeddingPromise = (async () => {
      const started = Date.now();
      traceStepStart(trace, "embed_message", { timeoutMs: 6500 });

      try {
        const emb = await timeout(embedVector(apiKey, message), 6500, "embed_message");
        lastEmbedding = emb;
        lastEmbeddingQuery = message;
        traceStepEnd(trace, "embed_message", Date.now() - started, { ok: true });
        return emb;
      } catch (e: any) {
        logError("embed_message_failed", e);
        traceStepFail(trace, "embed_message", Date.now() - started, e);
        return null;
      }
    })();

    let pf: PreflightOut;

    try {
      pf = await preflightPromise;
      traceStepEnd(trace, "preflight_parsed", 0, {
        route: pf.route,
        reason: pf.reason,
        rewritten: !!pf.rewrittenQuestion,
      });
    } catch (e: any) {
      logError("preflight_failed", e);
      pf = {
        route: "ANSWER_WITH_RAG",
        languageOk: true,
        detectedLanguage: "other",
        hasGreeting: false,
        isGreetingOnly: false,
        isFollowUp: false,
        rewrittenQuestion: "",
        reason: "preflight_failed",
      };

      traceStepEnd(trace, "preflight_fallback", 0, {
        reason: pf.reason,
      });
    }

    // logStep("PREFLIGHT_RESULT", pf);

    const route: Route = (pf.route as Route) || "ANSWER_WITH_RAG";
    traceStepEnd(trace, "route_selected", 0, { route });

    const chains = buildChains(apiKey, {
      chat: c.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      rerank: c.env.OPENAI_RERANK_MODEL || "gpt-4o-mini",
    });

    /* -------------------------------------------------------------------- */
    /* 3. EARLY ROUTES                                                      */
    /* -------------------------------------------------------------------- */

    if (route === "SMALL_TALK") {
      const ans = await traceSpan(
        trace,
        "smalltalk_answer",
        async () => {
          return await chains.smallTalk.invoke({
            message,
            language,
            history: historyPreview,
            assistantName,
            domainHint,
          } as any);
        },
        undefined,
        (a) => ({ answerChars: String(a || "").length })
      );

      enqueuePersist({
        answer: ans,
        context: "",
        tokensUsed: 0,
        ok: true,
        route,
      });

      traceStepEnd(trace, "done", now() - t0, {
        route,
        outcome: "small_talk",
      });

      return {
        status: 200,
        body: {
          ok: true,
          threadId,
          route,
          answer: ans,
        },
      };
    }

    if (route === "LANGUAGE_MISMATCH") {
      const ans = await traceSpan(
        trace,
        "lang_mismatch_answer",
        async () => {
          return await chains.langMismatch.invoke({
            language,
            assistantName,
          } as any);
        },
        undefined,
        (a) => ({ answerChars: String(a || "").length })
      );

      enqueuePersist({
        answer: ans,
        context: "",
        tokensUsed: 0,
        ok: false,
        route,
      });

      traceStepEnd(trace, "done", now() - t0, {
        route,
        outcome: "language_mismatch",
      });

      return {
        status: 200,
        body: {
          ok: true,
          threadId,
          route,
          answer: ans,
        },
      };
    }

    if (route === "NEEDS_CLARIFICATION") {
      const clarifyOptions = getClarifyOptions(c.env, domainHint);

      const ans = await traceSpan(
        trace,
        "clarify_answer",
        async () => {
          return await chains.clarify.invoke({
            message,
            language,
            history: historyPreview,
            assistantName,
            domainHint,
            clarifyOptions,
          } as any);
        },
        { options: clarifyOptions?.length || 0 },
        (a) => ({ answerChars: String(a || "").length })
      );

      enqueuePersist({
        answer: ans,
        context: "",
        tokensUsed: 0,
        ok: false,
        route,
      });

      traceStepEnd(trace, "done", now() - t0, {
        route,
        outcome: "clarification",
      });

      return {
        status: 200,
        body: {
          ok: true,
          threadId,
          route,
          answer: ans,
        },
      };
    }

    /* -------------------------------------------------------------------- */
    /* 4. FINAL QUERY + EMBEDDING                                           */
    /* -------------------------------------------------------------------- */

    const q = (pf.rewrittenQuestion && pf.rewrittenQuestion.trim()) || message;

    traceStepEnd(trace, "rag_query", 0, {
      qUsedRewrite: q !== message,
      qChars: q.length,
    });

    // logStep("RAG_QUERY", {
    //   original: message,
    //   finalQuery: q,
    //   usedRewrite: q !== message,
    // });

    let embedding = await embeddingPromise;

    if (!embedding || q !== message) {
      // NEW: Check if we can reuse cached embedding before recalculating
      if (lastEmbedding && lastEmbeddingQuery === q) {
        embedding = lastEmbedding;
        traceStepEnd(trace, "embed_choice", 0, { usedSpeculative: false, cached: true });
      } else {
        embedding = await traceSpan(
          trace,
          "embed_query",
          async () => {
            return await timeout(embedVector(apiKey, q), 6500, "embed_query");
          },
          {
            timeoutMs: 6500,
            reason: !embedding ? "no_speculative_embedding" : "rewritten_query",
          }
        ).catch((e) => {
          logError("embed_query_failed", e, { query: q.slice(0, 100) });
          traceStepFail(trace, "embed_query", 0, e);
          return null;
        });

        traceStepEnd(trace, "embed_choice", 0, { usedSpeculative: false });
      }
    } else {
      lastEmbedding = embedding;
      lastEmbeddingQuery = message;
      traceStepEnd(trace, "embed_choice", 0, { usedSpeculative: true });
    }

    // logStep("EMBEDDING_READY", {
    //   hasEmbedding: !!embedding,
    //   usedRewrite: q !== message,
    // });

    /* -------------------------------------------------------------------- */
    /* 4.5 CACHE CHECK (Layer 1: KV Exact, Layer 2: Vectorize Semantic)    */
    /* -------------------------------------------------------------------- */

    if (c.env.CACHE && q) {
      try {
        const cached = await getCachedQueryResponse(c.env.CACHE, q);
        if (cached) {
          logStep("CACHE_HIT_L1", { query: q, latencyMs: cached.latencyMs });
          traceStepEnd(trace, "cache_hit", cached.latencyMs, { layer: "L1_KV_EXACT" });

          enqueuePersist({
            answer: cached.answer,
            context: cached.context || "",
            tokensUsed: 0,
            ok: true,
            route: "ANSWER_WITH_RAG",
          });

          return {
            status: 200,
            body: buildFinalResponse({
              ok: true,
              threadId,
              route: "ANSWER_WITH_RAG",
              answer: cached.answer,
              outcome: "local_rag_success",
              tokensUsed: 0,
              usedChunks: 0,
              vectorUsed: 0,
              autoragUsed: 0,
              startedAt: t0,
              meta: { cacheHit: true, cacheLayer: "L1_KV_EXACT", cacheLatencyMs: cached.latencyMs },
            }),
          };
        }
      } catch (e: any) {
        logError("run_ask_cache_L1_failed", e);
      }
    }

    if (c.env.VECTORIZE_CACHE && c.env.CACHE && embedding) {
      try {
        const semHit = await getSemanticCacheHit(c.env.VECTORIZE_CACHE, embedding, c.env.CACHE);
        if (semHit.hit && semHit.answer) {
          logStep("CACHE_HIT_L2", { query: q, score: semHit.score });
          traceStepEnd(trace, "cache_hit", semHit.latencyMs || 0, { layer: "L2_SEMANTIC", score: semHit.score });

          enqueuePersist({
            answer: semHit.answer,
            context: "",
            tokensUsed: 0,
            ok: true,
            route: "ANSWER_WITH_RAG",
          });

          return {
            status: 200,
            body: buildFinalResponse({
              ok: true,
              threadId,
              route: "ANSWER_WITH_RAG",
              answer: semHit.answer,
              outcome: "local_rag_success",
              tokensUsed: 0,
              usedChunks: 0,
              vectorUsed: 0,
              autoragUsed: 0,
              startedAt: t0,
              meta: { cacheHit: true, cacheLayer: "L2_SEMANTIC", cacheScore: semHit.score, cacheLatencyMs: semHit.latencyMs },
            }),
          };
        }
      } catch (e: any) {
        logError("run_ask_cache_L2_failed", e);
      }
    }

    /* -------------------------------------------------------------------- */
    /* 5. PRIMARY RETRIEVAL                                                 */
    /* -------------------------------------------------------------------- */

    const vectorRes = await runPrimaryRetrievalStage({
      c,
      trace,
      apiKey,
      embedding,
      vecTopK: lim.vecTopK,
    });

    traceStepEnd(trace, "retrieval_counts", 0, {
      vector: vectorRes.length,
      autorag: 0,
    });

    // logStep("RETRIEVAL_SUMMARY", {
    //   vector: vectorRes.length,
    //   autorag: 0,
    // });

    /* -------------------------------------------------------------------- */
    /* 6. PRIMARY EVIDENCE                                                  */
    /* -------------------------------------------------------------------- */

    const finalEvidence = await traceSpan(
      trace,
      "build_primary_evidence",
      async () => {
        return buildFinalPrimaryEvidence({
          vectorPieces: vectorRes,
          finalMax: lim.finalEvidenceMax,
        });
      },
      { finalMax: lim.finalEvidenceMax },
      (ev) => ({
        used: ev.length,
        topScore: ev[0]?.score ?? 0,
      })
    );

    // logStep("PRIMARY_EVIDENCE", {
    //   count: finalEvidence.length,
    //   sources: finalEvidence.map((p) => p.sourceType),
    //   topScore: finalEvidence[0]?.score,
    // });

    /* -------------------------------------------------------------------- */
    /* 7. LLM RERANK                                                        */
    /* -------------------------------------------------------------------- */

    const reranked = await traceSpan(
      trace,
      "llm_rerank",
      async () => {
        return await rerankPiecesWithLLM({
          chains,
          question: q,
          pieces: finalEvidence,
          maxItems: Math.min(lim.rerankMaxItems, finalEvidence.length),
        });
      },
      { inputCount: finalEvidence.length },
      (res) => ({
        kept: res.kept.length,
      })
    ).catch((e) => {
      logError("llm_rerank_failed", e, { inputCount: finalEvidence.length });
      traceStepFail(trace, "llm_rerank", 0, e);
      return {
        kept: finalEvidence,
        rawText: "",
      };
    });

    // logStep("LLM_RERANK_RESULT", {
    //   before: finalEvidence.length,
    //   after: reranked.kept.length,
    //   raw: reranked.rawText?.slice(0, 300),
    // });

    /* -------------------------------------------------------------------- */
    /* 8. EVIDENCE GATE (WITH CONTENT VALIDATION)                           */
    /* -------------------------------------------------------------------- */

    const gate = evaluatePrimaryEvidence(reranked.kept, {
      minVectorScore: policy.minVectorScore,
      minKeep: 1,
      validateContent: true, // NEW: validate content quality
    });

    traceStepEnd(trace, "evidence_gate", 0, gate);
    // logStep("EVIDENCE_GATE", gate);

    /* -------------------------------------------------------------------- */
    /* 9. NO GOOD LOCAL EVIDENCE -> RESCUE                                  */
    /* -------------------------------------------------------------------- */

    if (gate.status !== "pass") {
      const rescue = await runAutoragRescueStage({
        c,
        trace,
        policy,
        question: q,
        threadId,
        startedAt: t0,
        fallbackMessage,
        reason:
          gate.reason === "no_primary_evidence"
            ? "no_primary_evidence"
            : "low_primary_scores",
      });

      const tokensUsed = approxTokens(q.length) + approxTokens(rescue.answer.length);

      traceSetFinalContext(trace, {
        selectedSource: rescue.ok ? "AUTORAG_RESCUE" : "FINAL_FALLBACK",
        pieces: [],
        finalContext: "",
      });

      traceStepEnd(trace, "final_stats", 0, {
        fallback: !rescue.ok,
        tokensUsed,
        usedChunks: 0,
        outcome: rescue.ok ? "autorag_rescue_success" : "final_fallback",
      });

      enqueuePersist({
        answer: rescue.answer,
        context: "",
        tokensUsed,
        ok: rescue.ok,
        route: "ANSWER_WITH_RAG",
      });

      traceStepEnd(trace, "done", now() - t0, {
        route: "ANSWER_WITH_RAG",
        fallback: !rescue.ok,
        outcome: rescue.ok ? "autorag_rescue_success" : "final_fallback",
      });

      return {
        status: 200,
        body: buildFinalResponse({
          ok: true,
          threadId,
          route: "ANSWER_WITH_RAG",
          answer: rescue.answer,
          outcome: rescue.ok ? "autorag_rescue_success" : "final_fallback",
          tokensUsed,
          usedChunks: 0,
          vectorUsed: 0,
          autoragUsed: rescue.rawPiecesCount,
          startedAt: t0,
          meta: {
            source: rescue.ok ? "autorag_rescue" : "final_fallback",
            fallback: !rescue.ok,
            rescueReason: rescue.reason,
          },
        }),
      };
    }

    /* -------------------------------------------------------------------- */
    /* 10. BUILD LOCAL CONTEXT                                              */
    /* -------------------------------------------------------------------- */

    const context = await traceSpan(
      trace,
      "build_context",
      async () => buildGroupedContextFromPieces(gate.keptPieces),
      { pieces: gate.keptPieces.length },
      (ctx) => ({ chars: String(ctx || "").length })
    );

    // NEW: Validate token limits before sending to answer chain
    const tokenValidation = validateTokenLimit(
      context.length,
      q.length,
      fallbackMessage.length,
      6000
    );
    if (!tokenValidation.ok) {
      logError("token_limit_exceeded", null, {
        tokensEstimated: tokenValidation.tokensEstimatedMax,
        warning: tokenValidation.warning,
      });
    }

    // logStep("CONTEXT_BUILT", {
    //   chars: context.length,
    //   preview: context.slice(0, 500),
    // });

    traceSetFinalContext(trace, {
      selectedSource: "PRIMARY_VECTOR_ONLY",
      pieces: gate.keptPieces,
      finalContext: context,
    });

    /* -------------------------------------------------------------------- */
    /* 11. PRIMARY ANSWER                                                   */
    /* -------------------------------------------------------------------- */

    const primaryAnswer = await runPrimaryAnswerStage({
      trace,
      chains,
      context,
      question: q,
      language,
      historyPreview,
      assistantName,
      domainHint,
      fallbackMessage,
    });

    // logStep("PRIMARY_ANSWER_RESULT", {
    //   fallback: primaryAnswer.fallback,
    //   weak: primaryAnswer.weak,
    //   error: primaryAnswer.error,
    //   preview: primaryAnswer.answer.slice(0, 300),
    // });

    /* -------------------------------------------------------------------- */
    /* 12. PRIMARY ANSWER FAILED / WEAK -> RESCUE                           */
    /* -------------------------------------------------------------------- */

    if (primaryAnswer.error || primaryAnswer.fallback || primaryAnswer.weak) {
      const rescueReason: RescueResult["reason"] =
        primaryAnswer.error
          ? "primary_answer_error"
          : primaryAnswer.fallback
          ? "primary_answer_fallback"
          : "primary_answer_weak";

      const rescue = await runAutoragRescueStage({
        c,
        trace,
        policy,
        question: q,
        threadId,
        startedAt: t0,
        fallbackMessage,
        reason: rescueReason,
      });

      const finalAnswer = rescue.ok ? rescue.answer : fallbackMessage;
      const outcome: FinalOutcome = rescue.ok
        ? "autorag_rescue_success"
        : "final_fallback";

      const tokensUsed =
        approxTokens(context.length) + approxTokens(finalAnswer.length);

      traceStepEnd(trace, "final_stats", 0, {
        fallback: !rescue.ok,
        tokensUsed,
        usedChunks: gate.keptPieces.length,
        outcome,
      });

      enqueuePersist({
        answer: finalAnswer,
        context,
        tokensUsed,
        ok: rescue.ok,
        route: "ANSWER_WITH_RAG",
      });

      traceStepEnd(trace, "done", now() - t0, {
        route: "ANSWER_WITH_RAG",
        fallback: !rescue.ok,
        outcome,
      });

      return {
        status: 200,
        body: buildFinalResponse({
          ok: true,
          threadId,
          route: "ANSWER_WITH_RAG",
          answer: finalAnswer,
          outcome,
          tokensUsed,
          usedChunks: gate.keptPieces.length,
          vectorUsed: gate.keptPieces.length,
          autoragUsed: rescue.rawPiecesCount,
          startedAt: t0,
          meta: {
            source: rescue.ok ? "autorag_rescue" : "final_fallback",
            fallback: !rescue.ok,
            rescueReason,
          },
        }),
      };
    }

    /* -------------------------------------------------------------------- */
    /* 13. LOCAL RAG SUCCESS                                                */
    /* -------------------------------------------------------------------- */

    const tokensUsed =
      approxTokens(context.length) + approxTokens(primaryAnswer.answer.length);

    traceStepEnd(trace, "final_stats", 0, {
      fallback: false,
      tokensUsed,
      usedChunks: gate.keptPieces.length,
      outcome: "local_rag_success",
    });

    enqueuePersist({
      answer: primaryAnswer.answer,
      context,
      tokensUsed,
      ok: true,
      route: "ANSWER_WITH_RAG",
    });

    if (c.env.CACHE && q) {
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const cachePayload = {
              answer: primaryAnswer.answer,
              context,
              sources: gate.keptPieces?.map((p: any) => ({ section: p.section, score: p.score })) || [],
              tokensUsed,
            };
            await saveQueryResponseToCache(c.env.CACHE, q, cachePayload);
            if (c.env.VECTORIZE_CACHE && embedding) {
              const normalized = normalizeQuery(q);
              if (normalized.length > 3) {
                const hash = await generateSha256Hash(normalized);
                await saveSemanticCacheEntry(c.env.VECTORIZE_CACHE, c.env.CACHE, hash, embedding, cachePayload);
              }
            }
          } catch (e: any) {
            logError("run_ask_cache_writeback_failed", e);
          }
        })()
      );
    }

    traceStepEnd(trace, "done", now() - t0, {
      route: "ANSWER_WITH_RAG",
      fallback: false,
      outcome: "local_rag_success",
    });

    return {
      status: 200,
      body: buildFinalResponse({
        ok: true,
        threadId,
        route: "ANSWER_WITH_RAG",
        answer: primaryAnswer.answer,
        outcome: "local_rag_success",
        tokensUsed,
        usedChunks: gate.keptPieces.length,
        vectorUsed: gate.keptPieces.length,
        autoragUsed: 0,
        startedAt: t0,
        meta: {
          source: "primary_vector_only",
          fallback: false,
        },
      }),
    };
  } catch (e: any) {
    logError("ask_fatal_error", e, { userId, threadId, message: message.slice(0, 100) });
    traceStepFail(trace, "fatal", now() - t0, e);

    enqueuePersist({
      answer: fallbackMessage,
      context: "",
      tokensUsed: 0,
      ok: false,
      route: "ANSWER_WITH_RAG",
    });

    return {
      status: 200,
      body: buildFinalResponse({
        ok: true,
        threadId,
        route: "ANSWER_WITH_RAG",
        answer: fallbackMessage,
        outcome: "final_fallback",
        tokensUsed: 0,
        usedChunks: 0,
        vectorUsed: 0,
        autoragUsed: 0,
        startedAt: t0,
        meta: {
          source: "fatal_fallback",
          fallback: true,
          error: String(e?.message || e || "unknown_error"),
        },
      }),
    };
  }
}