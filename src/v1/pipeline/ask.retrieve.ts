/**
 * ask.retrieve.ts
 *
 * Intelligent retrieval orchestration with retry/fallback logic.
 *
 * Pipeline:
 * 1. Vector retrieval (initial pass)
 * 2. Deduplication
 * 3. Score quality evaluation
 * 4. LLM reranking
 * 5. Evidence gating
 * 6. IF gate fails: Retry retrieval with smarter behavior
 *    - Increase topK
 *    - Relax score threshold
 *    - Try alternative query variants
 *    - Merge and rerank again
 * 7. Final context building
 *
 * Design principle: Don't silently fail - retry intelligently before giving up.
 */

import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../types/env";
import type { TraceShape } from "../utils/trace";

import {
  now,
  approxTokens,
  buildGroupedContextFromPieces,
  rerankPiecesWithLLM,
  dedupePiecesByKey,
  type Piece,
  type AskPolicy,
  type RuntimeLimits,
  type PrimaryEvidenceGateResult,
  type LocalEvidenceAssessment,
} from "../utils/ask-helper";
import { planQuery } from "../utils/query-planner";
import { retrieveLocalCandidates } from "../utils/local-retriever";
import { fuseCandidatePool } from "../utils/candidate-fuser";
import { decideLocalEvidence } from "../utils/local-evidence-gate";

import {
  traceEvent,
  traceSpan,
  traceSetRetrievalHits,
  traceStepEnd,
  traceStepFail,
  traceLogRetrievedChunks,
  traceLogRankedChunks,
} from "../utils/trace";

// Safety cap: runtime limits already clamp FINAL_EVIDENCE_MAX to <= 60 in getRuntimeLimits().
// Keep an explicit cap here to prevent accidental oversizing if limits are bypassed.
const HARD_MAX_FINAL_CONTEXT_PIECES = 60;

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reasons for retrieval retry
 */
export type RetryReason =
  | "rerank_output_invalid"
  | "rerank_output_empty"
  | "rerank_reduced_unacceptably"
  | "gate_failed_low_scores"
  | "gate_failed_no_evidence";

/**
 * Result from a single retrieval pass
 */
export type RetrievalPassResult = {
  rawPieces: Piece[];
  dedupedPieces: Piece[];
  rerankKept: Piece[];
  gateResult: PrimaryEvidenceGateResult;
  metrics: {
    rawCount: number;
    dedupedCount: number;
    rerankInputCount: number;
    rerankKept: number;
    rerankCoverage?: number | null;
    topScore: number;
    avgScore: number;
  };
};

/**
 * Final result from retrieval orchestration
 */
export type RetrieveResult = {
  ok: boolean;
  status: "local_rag_success" | "retry_pass_2" | "rescue_fallback";
  context: string;
  pieces: Piece[];
  localEvidence: LocalEvidenceAssessment;
  metrics: {
    pass1Count: number;
    pass1TopScore: number;
    pass2Count?: number;
    pass2TopScore?: number;
    finalCount: number;
    finalTopScore: number;
  };
  retryInfo?: {
    triggered: boolean;
    reason: RetryReason;
    pass1TopK: number;
    pass2TopK: number;
  };
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

function logWarn(label: string, context?: Record<string, any>) {
  console.warn(
    JSON.stringify({
      level: "WARN",
      label,
      ...(context || {}),
    })
  );
}

function safeJsonParseWithObjectRecovery<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const source = String(text || "");
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");

    if (start < 0 || end <= start) return fallback;

    try {
      return JSON.parse(source.slice(start, end + 1)) as T;
    } catch {
      return fallback;
    }
  }
}

function parseRerankCoverage(rawText: string): number | null {
  const parsed = safeJsonParseWithObjectRecovery<{ coverage?: unknown }>(
    String(rawText || ""),
    {}
  );

  const coverage = Number(parsed.coverage);
  if (!Number.isFinite(coverage)) return null;

  return Math.max(0, Math.min(100, Math.round(coverage)));
}

/**
 * Validate reranking output for correctness and usefulness
 */
function validateRerankOutput(
  result: Awaited<ReturnType<typeof rerankPiecesWithLLM>>,
  rerankInputCount: number
): {
  structurallyValid: boolean;
  sufficientlyStrong: boolean;
  issues: string[];
  warnings: string[];
  coverage: number | null;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const coverage = parseRerankCoverage(result.rawText || "");

  if (!result.kept || !Array.isArray(result.kept)) {
    issues.push("Rerank output not an array");
  }

  if (result.kept.length === 0) {
    issues.push("Rerank kept set is empty");
  }

  let avgScore = 0;
  if (result.kept.length > 0) {
    avgScore =
      result.kept.reduce((sum, p) => sum + (p.score || 0), 0) / result.kept.length;
    if (avgScore < 20 && rerankInputCount > 3) {
      issues.push(`Rerank filtered to low-quality pieces: avg score ${Math.round(avgScore)}`);
    }
  }

  if (result.kept.length > 0 && result.kept.length < rerankInputCount * 0.3 && rerankInputCount > 5) {
    const clearlyWeak = (coverage !== null && coverage < 25) || avgScore < 20;

    if (clearlyWeak) {
      issues.push(
        `Rerank reduced results drastically: ${result.kept.length}/${rerankInputCount} (< 30%)`
      );
    } else {
      warnings.push(
        `Rerank output is sparse but acceptable: ${result.kept.length}/${rerankInputCount}`
      );
    }
  }

  return {
    structurallyValid:
      !!result.kept &&
      Array.isArray(result.kept) &&
      result.kept.length > 0,
    sufficientlyStrong: issues.length === 0,
    issues,
    warnings,
    coverage,
  };
}

/* -------------------------------------------------------------------------- */
/*                         SINGLE RETRIEVAL PASS LOGIC                        */
/* -------------------------------------------------------------------------- */

/**
 * Execute a single retrieval pass.
 * Returns raw → deduped → reranked → gated results.
 */
async function executeSingleRetrievalPass(args: {
  c: Context<Env>;
  trace: TraceShape;
  apiKey: string;
  embedding: number[] | null;
  chains: any;
  question: string;
  historyPreview?: string;
  topK: number;
  minScoreThreshold: number;
  rerankMaxItems: number;
  finalEvidenceMax: number;
  passLabel: string; // "pass1" | "pass2" for logging
  policy: AskPolicy;
}): Promise<RetrievalPassResult> {
  const {
    c,
    trace,
    apiKey,
    embedding,
    chains,
    question,
    historyPreview,
    topK,
    minScoreThreshold,
    rerankMaxItems,
    finalEvidenceMax,
    passLabel,
  } = args;

  const plan = planQuery(question, historyPreview || "");
  traceEvent(trace, "planner", `${passLabel}_query_plan`, {
    intent: plan.intent,
    entities: plan.entities,
    exactPhrases: plan.exactPhrases,
    sectionRef: plan.sectionRef,
    searchMode: plan.searchMode,
    needsClarification: plan.needsClarification,
    usesHistory: plan.usesHistory,
    searchQuery: plan.searchQuery,
    keywords: plan.keywords,
  }, { level: "info", vis: "dev" });

  const db = c.env.DB as unknown as D1Database;
  const localResults = await traceSpan(
    trace,
    `${passLabel}_retrieve_local`,
    async () => {
      return await retrieveLocalCandidates({
        db,
        env: c.env,
        apiKey,
        embedding,
        question,
        plan,
        vectorTopK: topK,
        lexicalTopK: Math.min(Math.max(topK, 18), 24),
        metadataTopK: 12,
      });
    },
    {
      vectorTopK: topK,
      lexicalTopK: Math.min(Math.max(topK, 18), 24),
      metadataTopK: 12,
    },
    (result) => ({
      vectorCount: result.vectorPieces.length,
      lexicalCount: result.lexicalPieces.length,
      metadataCount: result.metadataPieces.length,
    })
  ).catch((e) => {
    logError(`${passLabel}_retrieve_local_failed`, e, { topK });
    traceStepFail(trace, `${passLabel}_retrieve_local`, 0, e);
    return {
      vectorPieces: [] as Piece[],
      lexicalPieces: [] as Piece[],
      metadataPieces: [] as Piece[],
    };
  });

  const vectorPieces = localResults.vectorPieces;
  const lexicalPieces = localResults.lexicalPieces;
  const metadataPieces = localResults.metadataPieces;

  // Enforce vector score threshold (configured via MIN_VECTOR_SCORE, relaxed in pass2).
  // NOTE: prior implementation passed minScoreThreshold but never applied it.
  const vectorPiecesAboveThreshold = (vectorPieces || []).filter(
    (p) => Number(p?.score ?? 0) >= Number(minScoreThreshold ?? 0)
  );

  traceEvent(
    trace,
    "vector",
    `${passLabel}_vector_threshold_applied`,
    {
      threshold: Number(minScoreThreshold ?? 0),
      beforeCount: vectorPieces.length,
      afterCount: vectorPiecesAboveThreshold.length,
      beforeTopScore: vectorPieces[0]?.score ?? 0,
      afterTopScore: vectorPiecesAboveThreshold[0]?.score ?? 0,
    },
    { level: "info", vis: "dev" }
  );

  traceSetRetrievalHits(trace, `vector_${passLabel}`, vectorPiecesAboveThreshold);
  traceEvent(trace, "lexical", `${passLabel}_hits`, {
    count: lexicalPieces.length,
    topScore: lexicalPieces[0]?.score ?? 0,
    exactPhraseMatches: lexicalPieces.filter((piece) => piece?.meta?.__exactPhraseMatch === true).length,
  }, { level: "info", vis: "dev" });
  traceEvent(trace, "metadata", `${passLabel}_hits`, {
    count: metadataPieces.length,
    topScore: metadataPieces[0]?.score ?? 0,
    exactEntityMatches: metadataPieces.filter((piece) => piece?.meta?.__exactEntityMatch === true).length,
    exactSectionMatches: metadataPieces.filter((piece) => piece?.meta?.__exactSectionMatch === true).length,
  }, { level: "info", vis: "dev" });

  const fusion = fuseCandidatePool({
    question,
    plan,
    vectorPieces: vectorPiecesAboveThreshold,
    lexicalPieces,
    metadataPieces,
    finalMax: Math.max(24, finalEvidenceMax * 2),
    rrfK: 50,
  });

  traceEvent(trace, "fusion", `${passLabel}_candidate_fusion`, {
    inputCount: fusion.counts.input,
    fusedCount: fusion.counts.fused,
    vectorCount: fusion.counts.vector,
    lexicalCount: fusion.counts.lexical,
    metadataCount: fusion.counts.metadata,
    exactEntityCount: fusion.counts.exactEntity,
    exactPhraseCount: fusion.counts.exactPhrase,
    exactSectionCount: fusion.counts.exactSection,
    topScore: fusion.candidates[0]?.score ?? 0,
  }, { level: "info", vis: "dev" });

  const dedupedPieces = dedupePiecesByKey(fusion.candidates);

  // Log retrieved chunks BEFORE reranking
  traceLogRetrievedChunks(trace, passLabel, dedupedPieces);

  // Step 3: LLM Reranking
  const rerankCandidateLimit = Math.min(Math.max(rerankMaxItems * 2, 16), 24, dedupedPieces.length);
  const rerankKeepMax = Math.min(Math.max(rerankMaxItems, 8), 10);
  const rerankResult = await traceSpan(
    trace,
    `${passLabel}_llm_rerank`,
    async () => {
      return await rerankPiecesWithLLM({
        chains,
        question,
        pieces: dedupedPieces,
        candidateLimit: rerankCandidateLimit,
        maxItems: rerankKeepMax,
      });
    },
    { inputCount: rerankCandidateLimit, keepMax: rerankKeepMax },
    (res) => ({
      kept: res.kept.length,
    })
  ).catch((e) => {
    logError(`${passLabel}_llm_rerank_failed`, e, { inputCount: rerankCandidateLimit });
    traceStepFail(trace, `${passLabel}_llm_rerank`, 0, e);

    // On rerank error, try to continue with original pieces
    return {
      kept: dedupedPieces.slice(0, rerankKeepMax),
      rawText: "",
    };
  });

  // Step 4: Validate rerank output
  const rerankValidation = validateRerankOutput(rerankResult, rerankCandidateLimit);
  if (rerankValidation.warnings.length) {
    logWarn(`${passLabel}_rerank_output_sparse`, {
      warnings: rerankValidation.warnings,
      inputCount: rerankCandidateLimit,
      outputCount: rerankResult.kept.length,
      coverage: rerankValidation.coverage,
    });
  }

  if (!rerankValidation.sufficientlyStrong) {
    logError(`${passLabel}_rerank_output_invalid`, null, {
      issues: rerankValidation.issues,
      inputCount: rerankCandidateLimit,
      outputCount: rerankResult.kept.length,
      coverage: rerankValidation.coverage,
    });
  }

  // Log reranked chunks AFTER reranking
  traceLogRankedChunks(trace, passLabel, rerankResult.kept, dedupedPieces.length);

  const evidenceDecision = decideLocalEvidence({
    plan,
    pieces: rerankResult.kept,
    rerankKept: rerankResult.kept.length,
    rerankCoverage: rerankValidation.coverage,
  });

  traceEvent(trace, "gate", `${passLabel}_local_evidence_decision`, {
    decision: evidenceDecision.decision,
    reason: evidenceDecision.reason,
    intent: plan.intent,
    searchMode: plan.searchMode,
    exactEntityMatch: evidenceDecision.assessment.exactEntityMatch,
    exactPhraseMatch: evidenceDecision.assessment.exactPhraseMatch,
    exactSectionMatch: evidenceDecision.assessment.exactSectionMatch,
    rerankKept: evidenceDecision.assessment.rerankKept,
    rerankCoverage: evidenceDecision.assessment.rerankCoverage,
    topScore: evidenceDecision.assessment.topScore,
    avgScore: evidenceDecision.assessment.avgScore,
    contentQualityValid: evidenceDecision.assessment.contentQualityValid,
    reasons: evidenceDecision.assessment.reasons,
  }, { level: "info", vis: "dev" });

  const gateResult: PrimaryEvidenceGateResult = {
    status: evidenceDecision.decision === "answer_local" ? "pass" : "rescue",
    reason: evidenceDecision.decision === "answer_local" ? "enough_evidence" : "low_primary_scores",
    keptPieces: rerankResult.kept.slice(0, Math.min(10, rerankResult.kept.length)),
    metrics: {
      count: rerankResult.kept.length,
      topScore: Number(rerankResult.kept[0]?.score || 0),
      avgScore: rerankResult.kept.length
        ? Math.round(rerankResult.kept.reduce((sum, piece) => sum + Number(piece.score || 0), 0) / rerankResult.kept.length)
        : 0,
    },
  };

  // Compile pass result
  const passMetrics = {
    rawCount: fusion.counts.input,
    dedupedCount: dedupedPieces.length,
    rerankInputCount: rerankCandidateLimit,
    rerankKept: rerankResult.kept.length,
    rerankCoverage: rerankValidation.coverage,
    topScore: dedupedPieces[0]?.score ?? 0,
    avgScore: dedupedPieces.length
      ? Math.round(dedupedPieces.reduce((sum, p) => sum + (p.score || 0), 0) / dedupedPieces.length)
      : 0,
  };

  traceStepEnd(trace, `${passLabel}_metrics`, 0, passMetrics);

  return {
    rawPieces: dedupedPieces,
    dedupedPieces,
    rerankKept: rerankResult.kept,
    gateResult,
    metrics: passMetrics,
  };
}

/* -------------------------------------------------------------------------- */
/*                        RETRIEVAL RETRY LOGIC                               */
/* -------------------------------------------------------------------------- */

/**
 * Decide if we should retry retrieval based on pass 1 results
 */
function shouldRetryRetrieval(pass1: RetrievalPassResult): {
  shouldRetry: boolean;
  reason?: RetryReason;
} {
  // If gate passed, no retry needed
  if (pass1.gateResult.status === "pass") {
    return { shouldRetry: false };
  }

  // Analyze why gate failed
  const rawValid = pass1.metrics.rawCount > 0;
  const dedupedValid = pass1.metrics.dedupedCount > 0;
  const rerankValid = pass1.metrics.rerankKept > 0;
  const topScoreValid = pass1.metrics.topScore >= 20;

  // Case 1: No raw results
  if (!rawValid) {
    return { shouldRetry: true, reason: "gate_failed_no_evidence" };
  }

  // Case 2: Reranking output was invalid or empty
  if (!rerankValid) {
    return { shouldRetry: true, reason: "rerank_output_empty" };
  }

  // Case 3: Reranking drastically reduced results
  if (
    pass1.metrics.rerankKept < pass1.metrics.rerankInputCount * 0.3 &&
    pass1.metrics.rerankInputCount > 4 &&
    (!pass1.metrics.rerankCoverage || pass1.metrics.rerankCoverage < 25) &&
    !topScoreValid
  ) {
    return { shouldRetry: true, reason: "rerank_reduced_unacceptably" };
  }

  // Case 4: Top score is too low
  if (!topScoreValid) {
    return { shouldRetry: true, reason: "gate_failed_low_scores" };
  }

  // Otherwise, probably OK - gate logic will decide
  return { shouldRetry: false };
}

/* -------------------------------------------------------------------------- */
/*                          PUBLIC ENTRY POINT                                */
/* -------------------------------------------------------------------------- */

/**
 * Main retrieval orchestration pipeline.
 * Handles initial retrieval + smart retry logic.
 *
 * @returns RetrieveResult with context ready for answer generation
 */
export async function retrievePipeline(
  c: Context<Env>,
  trace: TraceShape,
  apiKey: string,
  chains: any,
  policy: AskPolicy,
  limits: RuntimeLimits,
  embedding: number[] | null,
  question: string,
  historyPreview = ""
): Promise<RetrieveResult> {
  // ==== PASS 1: Initial Retrieval ====
  const pass1 = await executeSingleRetrievalPass({
    c,
    trace,
    apiKey,
    embedding,
    chains,
    question,
    historyPreview,
    topK: limits.vecTopK,
    minScoreThreshold: policy.minVectorScore,
    rerankMaxItems: limits.rerankMaxItems,
    finalEvidenceMax: limits.finalEvidenceMax,
    passLabel: "pass1",
    policy,
  });

  traceStepEnd(trace, "pass1_complete", 0, {
    gateStatus: pass1.gateResult.status,
    pieces: pass1.metrics.dedupedCount,
  });

  // ==== Check if Retry Needed ====
  const retryDecision = shouldRetryRetrieval(pass1);

  if (!retryDecision.shouldRetry || !embedding?.length) {
    // No retry needed; proceed with pass1 results
    const localEvidence = decideLocalEvidence({
      plan: planQuery(question, historyPreview),
      pieces: pass1.gateResult.keptPieces,
      rerankKept: pass1.metrics.rerankKept,
      rerankCoverage: pass1.metrics.rerankCoverage,
    }).assessment;
    const finalMax = Math.min(
      Math.max(1, Number(limits.finalEvidenceMax || 1)),
      HARD_MAX_FINAL_CONTEXT_PIECES
    );
    const finalLocalPieces = pass1.gateResult.keptPieces.slice(0, finalMax);

    traceEvent(
      trace,
      "context",
      "final_context_piece_cap_applied",
      {
        requestedFinalEvidenceMax: Number(limits.finalEvidenceMax || 0),
        appliedFinalMax: finalMax,
        keptPiecesAvailable: pass1.gateResult.keptPieces.length,
        finalCount: finalLocalPieces.length,
      },
      { level: "info", vis: "dev" }
    );

    return {
      ok: pass1.gateResult.status === "pass",
      status: pass1.gateResult.status === "pass" ? "local_rag_success" : "rescue_fallback",
      context: buildGroupedContextFromPieces(finalLocalPieces),
      pieces: finalLocalPieces,
      localEvidence,
      metrics: {
        pass1Count: pass1.metrics.dedupedCount,
        pass1TopScore: pass1.metrics.topScore,
        finalCount: finalLocalPieces.length,
        finalTopScore: pass1.gateResult.metrics.topScore,
      },
      retryInfo: {
        triggered: false,
        reason: retryDecision.reason || "gate_failed_no_evidence",
        pass1TopK: limits.vecTopK,
        pass2TopK: 0,
      },
    };
  }

  // ==== PASS 2: Retry with Smarter Behavior ====
  logError("retrieval_retry_triggered", null, {
    reason: retryDecision.reason,
    pass1Metrics: pass1.metrics,
  });

  const pass2TopK = Math.min(limits.vecTopK * 2, 50); // Increase topK by 2x
  const pass2MinScore = Math.max(policy.minVectorScore - 10, 20); // Relax threshold

  const pass2 = await executeSingleRetrievalPass({
    c,
    trace,
    apiKey,
    embedding,
    chains,
    question,
    historyPreview,
    topK: pass2TopK,
    minScoreThreshold: pass2MinScore,
    rerankMaxItems: limits.rerankMaxItems * 2, // Allow more items to rerank from
    finalEvidenceMax: limits.finalEvidenceMax,
    passLabel: "pass2",
    policy,
  });

  traceStepEnd(trace, "pass2_complete", 0, {
    gateStatus: pass2.gateResult.status,
    pieces: pass2.metrics.dedupedCount,
    improvement: pass2.metrics.dedupedCount > pass1.metrics.dedupedCount,
  });

  // ==== Merge Pass1 + Pass2 ====
  const mergedPieces = dedupePiecesByKey([
    ...pass1.gateResult.keptPieces,
    ...pass2.gateResult.keptPieces,
  ]);

  const finalMax = Math.min(
    Math.max(1, Number(limits.finalEvidenceMax || 1)),
    HARD_MAX_FINAL_CONTEXT_PIECES
  );
  const finalPieces = mergedPieces.slice(0, finalMax);
  const context = buildGroupedContextFromPieces(finalPieces);
  const localEvidence = decideLocalEvidence({
    plan: planQuery(question, historyPreview),
    pieces: finalPieces,
    rerankKept: Math.max(pass1.metrics.rerankKept, pass2.metrics.rerankKept),
    rerankCoverage: Math.max(pass1.metrics.rerankCoverage || 0, pass2.metrics.rerankCoverage || 0),
  }).assessment;

  traceEvent(
    trace,
    "context",
    "final_context_piece_cap_applied",
    {
      requestedFinalEvidenceMax: Number(limits.finalEvidenceMax || 0),
      appliedFinalMax: finalMax,
      keptPiecesAvailable: mergedPieces.length,
      finalCount: finalPieces.length,
    },
    { level: "info", vis: "dev" }
  );

  const pass2Improved = pass2.gateResult.status === "pass";

  return {
    ok: pass2Improved,
    status: pass2Improved ? "local_rag_success" : "retry_pass_2",
    context,
    pieces: finalPieces,
    localEvidence,
    metrics: {
      pass1Count: pass1.metrics.dedupedCount,
      pass1TopScore: pass1.metrics.topScore,
      pass2Count: pass2.metrics.dedupedCount,
      pass2TopScore: pass2.metrics.topScore,
      finalCount: finalPieces.length,
      finalTopScore: finalPieces[0]?.score ?? 0,
    },
    retryInfo: {
      triggered: true,
      reason: retryDecision.reason!,
      pass1TopK: limits.vecTopK,
      pass2TopK,
    },
  };
}
