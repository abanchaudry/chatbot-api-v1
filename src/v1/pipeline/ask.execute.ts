/**
 * ask.execute.ts
 *
 * Answer generation stage with dual-mode support (normal JSON + SSE streaming).
 *
 * This stage:
 * - Generates the final answer using the answer chain
 * - Handles answer quality evaluation
 * - Implements fallback/rescue logic if primary answer is weak/failed
 * - Supports both:
 *   1. Normal mode: returns full answer as string
 *   2. Streaming mode: yields tokens as AsyncGenerator for SSE
 * - Persists final conversation
 *
 * Design: Streaming and normal modes share the same answer generation,
 * just different consumption patterns.
 */

import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../types/env";
import type { TraceShape } from "../utils/trace";
import { format } from "date-fns";

import {
  now,
  timeout,
  approxTokens,
  classifyAnswerQuality,
  retrieveAutoragWebAIV2,
  validateTokenLimit,
  type LocalEvidenceAssessment,
} from "../utils/ask-helper";

import { traceSpan, traceStepEnd, traceStepFail, traceSetFinalContext, finalizeTrace, traceLogFinalContextDetail, traceLogAnswerGeneration } from "../utils/trace";

import { persist } from "../utils/ask-helper";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

/**
 * Primary answer generation result
 */
export type PrimaryAnswerResult = {
  answer: string;
  fallback: boolean;
  weak: boolean;
  error: boolean;
  tokensUsed: number;
};

/**
 * Rescue result when primary answer fails/is weak
 */
export type RescueAnswerResult = {
  used: boolean;
  ok: boolean;
  answer: string;
  source: "autorag_rescue" | "final_fallback";
  reason: "autorag_rescued" | "autorag_failed" | "primary_error" | "primary_fallback" | "primary_weak";
  rawPiecesCount: number;
  tokensUsed: number;
};

/**
 * Final execution result (used by normal endpoint)
 */
export type ExecuteResult = {
  ok: boolean;
  answer: string;
  tokensUsed: number;
  outcome: "local_rag_success" | "autorag_rescue_success" | "final_fallback";
  source: string;
};

/* -------------------------------------------------------------------------- */
/*                           SMALL LOCAL HELPERS                              */
/* -------------------------------------------------------------------------- */

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

function logInfo(label: string, context?: Record<string, any>) {
  console.log(
    JSON.stringify({
      level: "INFO",
      label,
      ...(context || {}),
    })
  );
}

function shouldCallCloudflareRescue(args: {
  localEvidence: LocalEvidenceAssessment;
  primaryError: boolean;
  primaryFallback: boolean;
  primaryWeak: boolean;
}) {
  const { localEvidence, primaryError, primaryFallback, primaryWeak } = args;

  if (primaryError || primaryFallback) {
    return {
      shouldCall: true,
      reason: primaryError ? "primary_error" : "primary_fallback",
    };
  }

  if (primaryWeak && localEvidence.sufficient) {
    return {
      shouldCall: false,
      reason: "local_evidence_sufficient",
    };
  }

  return {
    shouldCall: true,
    reason: primaryWeak ? "local_evidence_weak" : "rescue_not_needed",
  };
}

/* -------------------------------------------------------------------------- */
/*                         CONTEXT TOKEN BUDGETING                            */
/* -------------------------------------------------------------------------- */

/**
 * Deterministically trim context by dropping whole evidence blocks from the end
 * until the estimated token budget is satisfied.
 *
 * Context format is blocks separated by "\n\n---\n\n" (see buildGroupedContextFromPieces).
 */
function trimContextToTokenBudget(args: {
  context: string;
  question: string;
  fallbackMessage: string;
  maxContextTokens: number;
}): {
  context: string;
  changed: boolean;
  removedBlocks: number;
  before: { chars: number; tokensEstimatedMax: number; tokensContext: number };
  after: { chars: number; tokensEstimatedMax: number; tokensContext: number };
} {
  const delimiter = "\n\n---\n\n";
  const original = String(args.context || "");

  const beforeValidation = validateTokenLimit(
    original.length,
    args.question.length,
    args.fallbackMessage.length,
    args.maxContextTokens
  );

  if (beforeValidation.ok || !original.trim()) {
    return {
      context: original,
      changed: false,
      removedBlocks: 0,
      before: {
        chars: original.length,
        tokensEstimatedMax: beforeValidation.tokensEstimatedMax,
        tokensContext: beforeValidation.tokensContext,
      },
      after: {
        chars: original.length,
        tokensEstimatedMax: beforeValidation.tokensEstimatedMax,
        tokensContext: beforeValidation.tokensContext,
      },
    };
  }

  const blocks = original.split(delimiter).filter((b) => b.trim().length > 0);

  // Always keep at least 1 block if any exist.
  let keep = Math.max(1, blocks.length);
  let candidate = blocks.slice(0, keep).join(delimiter);

  while (keep > 1) {
    const v = validateTokenLimit(
      candidate.length,
      args.question.length,
      args.fallbackMessage.length,
      args.maxContextTokens
    );
    if (v.ok) break;
    keep -= 1;
    candidate = blocks.slice(0, keep).join(delimiter);
  }

  const maxAllowedChars = Math.max(2000, args.maxContextTokens * 4);
  if (candidate.length > maxAllowedChars) {
    candidate = candidate.slice(0, maxAllowedChars) + "\n\n[...context truncated for length]";
  }

  const afterValidation = validateTokenLimit(
    candidate.length,
    args.question.length,
    args.fallbackMessage.length,
    args.maxContextTokens
  );

  return {
    context: candidate,
    changed: candidate !== original,
    removedBlocks: Math.max(0, blocks.length - keep),
    before: {
      chars: original.length,
      tokensEstimatedMax: beforeValidation.tokensEstimatedMax,
      tokensContext: beforeValidation.tokensContext,
    },
    after: {
      chars: candidate.length,
      tokensEstimatedMax: afterValidation.tokensEstimatedMax,
      tokensContext: afterValidation.tokensContext,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                      PRIMARY ANSWER GENERATION                             */
/* -------------------------------------------------------------------------- */

/**
 * Generate primary answer using the answer chain.
 * For normal (non-streaming) mode.
 */
export async function generatePrimaryAnswer(args: {
  trace: TraceShape;
  chain: any;
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
    chain,
    context,
    question,
    language,
    historyPreview,
    assistantName,
    domainHint,
    fallbackMessage,
  } = args;

  try {
    console.log("--- FINAL CONTEXT SENT TO GPT-4O --- \n" + context);
    const answerResult = await traceSpan(
      trace,
      "answer_primary",
      async () => {
        const currentDate = format(new Date(), "EEEE, MMMM d, yyyy (HH:mm 'UTC')");
        return await timeout(
          chain.invoke({
            context,
            question,
            language,
            history: historyPreview,
            assistantName,
            domainHint,
            fallbackMessage,
            currentDate,
          } as any),
          9500,
          "answer_primary"
        );
      },
      { timeoutMs: 9500 },
      (a) => ({ answerChars: String(a || "").length })
    );
    const answer = String(answerResult || "");

    const quality = classifyAnswerQuality(answer, fallbackMessage);
    const tokensUsed = approxTokens(context.length) + approxTokens(answer.length);

    // Log answer generation
    traceLogAnswerGeneration(trace, answer, "primary_rag", tokensUsed);

    return {
      answer,
      fallback: quality === "fallback",
      weak: quality === "weak",
      error: false,
      tokensUsed,
    };
  } catch (e: any) {
    logError("answer_primary_failed", e);
    traceStepFail(trace, "answer_primary", 0, e);

    return {
      answer: fallbackMessage,
      fallback: true,
      weak: false,
      error: true,
      tokensUsed: approxTokens(fallbackMessage.length),
    };
  }
}

/**
 * Stream primary answer tokens in real-time.
 * For SSE streaming mode.
 *
 * This is an async generator that yields tokens as they stream from the LLM.
 */
export async function* streamPrimaryAnswer(args: {
  trace: TraceShape;
  chain: any;
  context: string;
  question: string;
  language: "english" | "spanish";
  historyPreview: string;
  assistantName: string;
  domainHint: string;
  fallbackMessage: string;
}): AsyncGenerator<string, string, unknown> {
  const {
    trace,
    chain,
    context,
    question,
    language,
    historyPreview,
    assistantName,
    domainHint,
    fallbackMessage,
  } = args;

  let fullAnswer = "";

  try {
    traceStepEnd(trace, "stream_answer_start", 0, {
      contextChars: context.length,
    });

    // Use LangChain streaming if available
    const stream = await chain.stream({
      context,
      question,
      language,
      history: historyPreview,
      assistantName,
      domainHint,
      fallbackMessage,
    } as any);

    for await (const chunk of stream) {
      const text = typeof chunk === "string" ? chunk : chunk.content || "";

      if (text) {
        fullAnswer += text;
        yield text; // Yield for SSE transmission
      }
    }

    traceStepEnd(trace, "stream_answer_complete", 0, {
      totalChars: fullAnswer.length,
    });

    // Log streaming answer generation
    const streamTokens = approxTokens(context.length) + approxTokens(fullAnswer.length);
    traceLogAnswerGeneration(trace, fullAnswer, "primary_rag", streamTokens);

    return fullAnswer;
  } catch (e: any) {
    logError("stream_answer_failed", e);
    traceStepFail(trace, "stream_answer_failed", 0, e);

    const fallback = fallbackMessage;
    yield fallback;

    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/*                      RESCUE/FALLBACK ANSWER GENERATION                     */
/* -------------------------------------------------------------------------- */

/**
 * Generate rescue answer when primary answer fails or is weak
 */
export async function generateRescueAnswer(args: {
  c: Context<Env>;
  trace: TraceShape;
  policy: any;
  question: string;
  threadId: string;
  startedAt: number;
  fallbackMessage: string;
  primaryError: boolean;
  primaryFallback: boolean;
  primaryWeak: boolean;
}): Promise<RescueAnswerResult> {
  const {
    c,
    trace,
    policy,
    question,
    threadId,
    startedAt,
    fallbackMessage,
    primaryError,
    primaryFallback,
    primaryWeak,
  } = args;

  let reason: RescueAnswerResult["reason"] = "primary_error";
  if (primaryError) {
    reason = "primary_error";
  } else if (primaryFallback) {
    reason = "primary_fallback";
  } else if (primaryWeak) {
    reason = "primary_weak";
  }

  // Attempt AutoRAG rescue
  try {
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
          `${threadId}:${startedAt}:answer_rescue_${reason}`,
          {
            model: policy.autoragModel,
            rewriteQuery: policy.autoragRewriteQuery,
            rerankEnabled: policy.autoragRerankEnabled,
            rerankModel: policy.autoragRerankModel,
            scoreThreshold01: policy.autoragScoreThreshold01,
          }
        );
      },
      { reason },
      (res) => ({ count: res.pieces?.length || 0 })
    ).catch((e: any) => {
      logError("autorag_rescue_failed", e);
      traceStepFail(trace, "autorag_rescue", 0, e);
      return { pieces: [], reason: "error" as const };
    });

    const answer = String(rescue.pieces?.[0]?.text || "").trim();
    const tokensUsed = approxTokens(answer.length);

    if (!answer) {
      return {
        used: true,
        ok: false,
        answer: fallbackMessage,
        source: "final_fallback",
        reason: "autorag_failed",
        rawPiecesCount: rescue.pieces?.length || 0,
        tokensUsed,
      };
    }

    return {
      used: true,
      ok: true,
      answer,
      source: "autorag_rescue",
      reason: "autorag_rescued",
      rawPiecesCount: rescue.pieces?.length || 0,
      tokensUsed,
    };
  } catch (e: any) {
    logError("rescue_answer_generation_failed", e);
    return {
      used: false,
      ok: false,
      answer: fallbackMessage,
      source: "final_fallback",
      reason: "autorag_failed",
      rawPiecesCount: 0,
      tokensUsed: approxTokens(fallbackMessage.length),
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                        EXECUTION PIPELINE (NORMAL MODE)                    */
/* -------------------------------------------------------------------------- */

/**
 * Full execution pipeline for normal (non-streaming) endpoint.
 * Returns final answer + metadata.
 */
export async function executePipeline(args: {
  c: Context<Env>;
  trace: TraceShape;
  policy: any;
  question: string;
  threadId: string;
  userId: string;
  context: string;
  language: "english" | "spanish";
  historyPreview: string;
  assistantName: string;
  domainHint: string;
  fallbackMessage: string;
  chains: any;
  startedAt: number;
  localEvidence: LocalEvidenceAssessment;
}): Promise<ExecuteResult> {
  const {
    c,
    trace,
    policy,
    question,
    threadId,
    userId,
    context,
    language,
    historyPreview,
    assistantName,
    domainHint,
    fallbackMessage,
    chains,
    startedAt,
    localEvidence,
  } = args;

  // ==== Enforce token budget (deterministic, by dropping lowest-ranked blocks) ====
  const budget = 6000;
  const trimmed = trimContextToTokenBudget({
    context,
    question,
    fallbackMessage,
    maxContextTokens: budget,
  });

  if (trimmed.changed) {
    logInfo("execute_context_trimmed_to_budget", {
      removedBlocks: trimmed.removedBlocks,
      budget,
      beforeChars: trimmed.before.chars,
      afterChars: trimmed.after.chars,
      beforeTokensEstimated: trimmed.before.tokensEstimatedMax,
      afterTokensEstimated: trimmed.after.tokensEstimatedMax,
    });
    traceStepEnd(trace, "execute_context_trimmed_to_budget", 0, {
      removedBlocks: trimmed.removedBlocks,
      budget,
      beforeChars: trimmed.before.chars,
      afterChars: trimmed.after.chars,
      beforeTokensEstimated: trimmed.before.tokensEstimatedMax,
      afterTokensEstimated: trimmed.after.tokensEstimatedMax,
    });
  } else {
    const tokenValidation = validateTokenLimit(
      context.length,
      question.length,
      fallbackMessage.length,
      budget
    );
    if (!tokenValidation.ok) {
      logError("execute_token_limit_exceeded", null, {
        tokensEstimated: tokenValidation.tokensEstimatedMax,
        warning: tokenValidation.warning,
      });
    }
  }

  // ==== Generate primary answer ====
  const primaryAnswer = await generatePrimaryAnswer({
    trace,
    chain: chains.answer,
    context: trimmed.context,
    question,
    language,
    historyPreview,
    assistantName,
    domainHint,
    fallbackMessage,
  });

  // ==== Check if rescue needed ====
  if (primaryAnswer.error || primaryAnswer.fallback || primaryAnswer.weak) {
    const rescueDecision = shouldCallCloudflareRescue({
      localEvidence,
      primaryError: primaryAnswer.error,
      primaryFallback: primaryAnswer.fallback,
      primaryWeak: primaryAnswer.weak,
    });

    if (!rescueDecision.shouldCall) {
      logInfo("cloudflare_ai_search_skipped", {
        reason: rescueDecision.reason,
        topScore: localEvidence.topScore,
        avgScore: localEvidence.avgScore,
        exactSectionMatch: localEvidence.exactSectionMatch,
        keywordHybridHits: localEvidence.keywordHybridHits,
        hybridHits: localEvidence.hybridHits,
        rerankKept: localEvidence.rerankKept,
        rerankCoverage: localEvidence.rerankCoverage,
        contentQualityValid: localEvidence.contentQualityValid,
        evidenceReasons: localEvidence.reasons,
      });

      traceSetFinalContext(trace, {
        selectedSource: "PRIMARY_VECTOR",
        pieces: [],
        finalContext: trimmed.context,
      });

      traceStepEnd(trace, "final_execution", 0, {
        source: "primary_vector",
        ok: true,
        tokensUsed: primaryAnswer.tokensUsed,
      });

      const db = c.env.DB as unknown as D1Database;
      const keepDev = true;
      const finalTrace = finalizeTrace(trace, keepDev);

      c.executionCtx.waitUntil(
        persist(
          db,
          userId,
          threadId,
          question,
          primaryAnswer.answer,
          trimmed.context,
          primaryAnswer.tokensUsed,
          "success",
          JSON.stringify(finalTrace)
        ).catch((e) => {
          logError("persist_failed", e, { userId, threadId });
        })
      );

      return {
        ok: true,
        answer: primaryAnswer.answer,
        tokensUsed: primaryAnswer.tokensUsed,
        outcome: "local_rag_success",
        source: "primary_vector_rag",
      };
    }

    logInfo("cloudflare_ai_search_called", {
      reason: rescueDecision.reason,
      topScore: localEvidence.topScore,
      avgScore: localEvidence.avgScore,
      exactSectionMatch: localEvidence.exactSectionMatch,
      keywordHybridHits: localEvidence.keywordHybridHits,
      hybridHits: localEvidence.hybridHits,
      rerankKept: localEvidence.rerankKept,
      rerankCoverage: localEvidence.rerankCoverage,
      contentQualityValid: localEvidence.contentQualityValid,
      evidenceReasons: localEvidence.reasons,
    });

    const rescue = await generateRescueAnswer({
      c,
      trace,
      policy,
      question,
      threadId,
      startedAt,
      fallbackMessage,
      primaryError: primaryAnswer.error,
      primaryFallback: primaryAnswer.fallback,
      primaryWeak: primaryAnswer.weak,
    });

    traceSetFinalContext(trace, {
      selectedSource: rescue.ok ? "AUTORAG_RESCUE" : "FINAL_FALLBACK",
      pieces: [],
      finalContext: "",
    });

    traceStepEnd(trace, "final_execution", 0, {
      source: rescue.source,
      ok: rescue.ok,
      tokensUsed: rescue.tokensUsed,
    });

    // Persist
    const db = c.env.DB as unknown as D1Database;
    const keepDev = true;
    const finalTrace = finalizeTrace(trace, keepDev);

    c.executionCtx.waitUntil(
      persist(
        db,
        userId,
        threadId,
        question,
        rescue.answer,
        "",
        rescue.tokensUsed,
        rescue.ok ? "success" : "degraded",
        JSON.stringify(finalTrace)
      ).catch((e) => {
        logError("persist_failed", e, { userId, threadId });
      })
    );

    return {
      ok: true,
      answer: rescue.answer,
      tokensUsed: rescue.tokensUsed,
      outcome: rescue.ok ? "autorag_rescue_success" : "final_fallback",
      source: rescue.source,
    };
  }

  // ==== Success: Local RAG ====
  traceSetFinalContext(trace, {
    selectedSource: "PRIMARY_VECTOR",
    pieces: [],
    finalContext: trimmed.context,
  });

  traceStepEnd(trace, "final_execution", 0, {
    source: "primary_vector",
    ok: true,
    tokensUsed: primaryAnswer.tokensUsed,
  });

  // Persist
  const db = c.env.DB as unknown as D1Database;
  const keepDev = true;
  const finalTrace = finalizeTrace(trace, keepDev);

  c.executionCtx.waitUntil(
    persist(
      db,
      userId,
      threadId,
      question,
      primaryAnswer.answer,
      trimmed.context,
      primaryAnswer.tokensUsed,
      "success",
      JSON.stringify(finalTrace)
    ).catch((e) => {
      logError("persist_failed", e, { userId, threadId });
    })
  );

  return {
    ok: true,
    answer: primaryAnswer.answer,
    tokensUsed: primaryAnswer.tokensUsed,
    outcome: "local_rag_success",
    source: "primary_vector_rag",
  };
}
