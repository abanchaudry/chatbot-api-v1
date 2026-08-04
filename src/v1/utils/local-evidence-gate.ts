import type { Piece, LocalEvidenceAssessment } from "./ask-helper";
import { validateContentQuality } from "./ask-helper";
import type { QueryPlan } from "./query-planner";

export type LocalEvidenceDecision = {
  decision: "answer_local" | "needs_rescue";
  reason: string;
  assessment: LocalEvidenceAssessment;
};

function averageScore(pieces: Piece[]) {
  if (!pieces.length) return 0;
  return Math.round(
    pieces.reduce((sum, piece) => sum + Number(piece.score || 0), 0) / pieces.length
  );
}

export function decideLocalEvidence(args: {
  plan: QueryPlan;
  pieces: Piece[];
  rerankKept: number;
  rerankCoverage?: number | null;
}): LocalEvidenceDecision {
  const pieces = args.pieces || [];
  const topScore = Number(pieces[0]?.score || 0);
  const avgScore = averageScore(pieces);
  const exactEntityMatch = pieces.some((piece) => piece?.meta?.__exactEntityMatch === true);
  const exactPhraseMatch = pieces.some((piece) => piece?.meta?.__exactPhraseMatch === true);
  const exactSectionMatch = pieces.some((piece) => piece?.meta?.__exactSectionMatch === true);
  const keywordHybridHits = pieces.slice(0, 5).reduce((count, piece) => {
    const haystack = `${piece.title || ""} ${piece.section || ""} ${String(piece.text || "").slice(0, 500)}`.toLowerCase();
    const hits = args.plan.keywords.filter((keyword) => haystack.includes(keyword)).length;
    return count + (hits >= 2 ? 1 : 0);
  }, 0);
  const hybridHits = pieces.filter((piece) => {
    const origins = piece?.meta?.__origins;
    return Array.isArray(origins)
      ? origins.includes("lexical") || origins.includes("metadata")
      : piece?.meta?.__origin === "lexical" || piece?.meta?.__origin === "metadata";
  }).length;
  const contentQuality = validateContentQuality(pieces);
  const rerankCoverage = typeof args.rerankCoverage === "number" ? args.rerankCoverage : null;
  const hasExactGrounding = exactEntityMatch || exactPhraseMatch || exactSectionMatch;
  const hasHybridGrounding = hybridHits >= 2;
  const hasKeywordGrounding = keywordHybridHits >= 2;
  const hasCoverageGrounding = (rerankCoverage || 0) >= 60;
  const isBroadQuery =
    args.plan.intent === "ambiguous" ||
    args.plan.searchMode === "support_broad" ||
    args.plan.searchMode === "phrase_exact";

  const reasons: string[] = [];
  if (exactEntityMatch) reasons.push("exact_entity_match");
  if (exactPhraseMatch) reasons.push("exact_phrase_match");
  if (exactSectionMatch) reasons.push("exact_section_match");
  if (keywordHybridHits > 0) reasons.push(`keyword_hits:${keywordHybridHits}`);
  if (hybridHits > 0) reasons.push(`hybrid_hits:${hybridHits}`);
  if (args.rerankKept > 0) reasons.push(`rerank_kept:${args.rerankKept}`);
  if (typeof args.rerankCoverage === "number") reasons.push(`rerank_coverage:${args.rerankCoverage}`);
  if (contentQuality.valid) reasons.push("content_quality_valid");

  const broadQueryGrounded =
    hasExactGrounding ||
    hasCoverageGrounding ||
    (hasHybridGrounding && hasKeywordGrounding);

  const sufficient =
    pieces.length > 0 &&
    contentQuality.valid &&
    (
      (exactEntityMatch && topScore >= 45) ||
      (exactPhraseMatch && topScore >= 48) ||
      (exactSectionMatch && topScore >= 48) ||
      (args.rerankKept >= 1 && hasExactGrounding) ||
      (hasCoverageGrounding && topScore >= 45) ||
      (!isBroadQuery && args.rerankKept >= 2 && avgScore >= 45 && (hasHybridGrounding || hasKeywordGrounding)) ||
      (isBroadQuery && broadQueryGrounded && args.rerankKept >= 2 && topScore >= 55 && avgScore >= 50)
    );

  const assessment: LocalEvidenceAssessment = {
    sufficient,
    exactEntityMatch,
    exactPhraseMatch,
    exactSectionMatch,
    keywordHybridHits,
    hybridHits,
    rerankKept: args.rerankKept,
    rerankCoverage: args.rerankCoverage ?? null,
    topScore,
    avgScore,
    contentQualityValid: contentQuality.valid,
    reasons,
    intent: args.plan.intent,
    searchMode: args.plan.searchMode,
  };

  return {
    decision: sufficient ? "answer_local" : "needs_rescue",
    reason: sufficient ? "local_evidence_sufficient" : "local_evidence_insufficient",
    assessment,
  };
}
