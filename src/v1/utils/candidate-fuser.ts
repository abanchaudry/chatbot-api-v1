import type { Piece } from "./ask-helper";
import type { QueryPlan } from "./query-planner";

export type CandidateFusionResult = {
  candidates: Piece[];
  counts: {
    input: number;
    fused: number;
    vector: number;
    lexical: number;
    metadata: number;
    exactEntity: number;
    exactPhrase: number;
    exactSection: number;
  };
};

type FusionInput = {
  question: string;
  plan: QueryPlan;
  vectorPieces: Piece[];
  lexicalPieces: Piece[];
  metadataPieces: Piece[];
  finalMax: number;
  rrfK?: number;
  datasetWeights?: Record<string, number>;
  activeDatasets?: string[];
};

function clamp100(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rrf(rank: number, k: number) {
  return 1 / (k + rank);
}

function getOrigin(piece: Piece): "vector" | "lexical" | "metadata" {
  const origin = String(piece?.meta?.__origin || "");
  if (origin === "metadata") return "metadata";
  if (origin === "lexical" || origin === "local_hybrid") return "lexical";
  return "vector";
}

function isGenericChunk(piece: Piece): boolean {
  const title = normalize(piece.title || "");
  const section = normalize(piece.section || "");
  const text = normalize(String(piece.text || "").slice(0, 220));

  return (
    title === "page metadata" ||
    /source url|page title|main heading/.test(text) ||
    /page metadata/.test(section)
  );
}

function isLowSubstance(piece: Piece): boolean {
  return String(piece.text || "").trim().length < 80;
}

function dedupeByChunkId(pieces: Piece[]): Piece[] {
  const seen = new Set<string>();
  const out: Piece[] = [];

  for (const piece of pieces || []) {
    const key = `${piece.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(piece);
  }

  return out;
}

export function fuseCandidatePool(input: FusionInput): CandidateFusionResult {
  const {
    vectorPieces,
    lexicalPieces,
    metadataPieces,
    finalMax,
    rrfK = 50,
    datasetWeights = {
      admin: 1.25,
      pdf: 1.10,
      web: 1.00,
    },
    activeDatasets,
  } = input;

  const activeSet = Array.isArray(activeDatasets) && activeDatasets.length > 0
    ? new Set(activeDatasets.map((d) => String(d).toLowerCase()))
    : null;

  const filterDisabled = (pieces: Piece[]) =>
    (pieces || []).filter((p) => {
      const ds = String(p?.meta?.dataset || "admin").toLowerCase();
      if (activeSet && !activeSet.has(ds)) return false;
      if (datasetWeights[ds] === 0) return false;
      return true;
    });

  const rankedLists: Array<{ origin: "vector" | "lexical" | "metadata"; items: Piece[] }> = [
    { origin: "vector", items: dedupeByChunkId(filterDisabled(vectorPieces)) },
    { origin: "lexical", items: dedupeByChunkId(filterDisabled(lexicalPieces)) },
    { origin: "metadata", items: dedupeByChunkId(filterDisabled(metadataPieces)) },
  ];

  const merged = new Map<string, Piece & { __fusionScore?: number; __origins?: string[] }>();

  for (const ranked of rankedLists) {
    ranked.items.forEach((piece, index) => {
      const key = String(piece.sourceId || "");
      const existing = merged.get(key);

      const pieceDataset = String(piece?.meta?.dataset || "admin").toLowerCase();
      const datasetMultiplier = Number(datasetWeights[pieceDataset] ?? 1.0);

      // Weighted RRF Contribution: base RRF * originMultiplier * datasetPriorityWeight
      const fusionContribution =
        rrf(index + 1, rrfK) *
        (ranked.origin === "metadata" ? 1.35 : ranked.origin === "lexical" ? 1.1 : 1) *
        datasetMultiplier;

      const exactEntityMatch = piece?.meta?.__exactEntityMatch === true;
      const exactPhraseMatch = piece?.meta?.__exactPhraseMatch === true;
      const exactSectionMatch = piece?.meta?.__exactSectionMatch === true;

      const bonus =
        (exactEntityMatch ? 0.22 : 0) +
        (exactPhraseMatch ? 0.18 : 0) +
        (exactSectionMatch ? 0.2 : 0) -
        (isGenericChunk(piece) ? 0.18 : 0) -
        (isLowSubstance(piece) ? 0.08 : 0);

      const nextScore = (existing?.__fusionScore || 0) + fusionContribution + bonus;
      const origins = Array.from(
        new Set([...(existing?.__origins || []), ranked.origin])
      );

      const existingDataset = String(existing?.meta?.dataset || "admin").toLowerCase();
      const existingWeight = Number(datasetWeights[existingDataset] ?? 1.0);

      const pieceTextLen = String(piece.text || "").trim().length;
      const existingTextLen = String(existing?.text || "").trim().length;

      let bestPiece = existing || piece;
      if (!existing) {
        bestPiece = piece;
      } else if (pieceTextLen >= 50 && existingTextLen < 50) {
        bestPiece = piece;
      } else if (existingTextLen >= 50 && pieceTextLen < 50) {
        bestPiece = existing;
      } else if (datasetMultiplier > existingWeight) {
        bestPiece = piece;
      } else if (datasetMultiplier === existingWeight && Number(piece.score || 0) >= Number(existing.score || 0)) {
        bestPiece = piece;
      }

      merged.set(key, {
        ...bestPiece,
        meta: {
          ...((bestPiece.meta || {}) as Record<string, any>),
          dataset: pieceDataset,
          __origin: origins.includes("metadata")
            ? "metadata"
            : origins.includes("lexical")
              ? "lexical"
              : "vector",
          __origins: origins,
          __exactEntityMatch:
            exactEntityMatch || (existing?.meta as any)?.__exactEntityMatch === true,
          __exactPhraseMatch:
            exactPhraseMatch || (existing?.meta as any)?.__exactPhraseMatch === true,
          __exactSectionMatch:
            exactSectionMatch || (existing?.meta as any)?.__exactSectionMatch === true,
        },
        __fusionScore: nextScore,
        __origins: origins,
      });
    });
  }

  const sorted = Array.from(merged.values()).sort(
    (a, b) => Number(b.__fusionScore || 0) - Number(a.__fusionScore || 0)
  );
  const topFusion = Math.max(Number(sorted[0]?.__fusionScore || 1), 1e-6);

  const candidates = sorted.slice(0, finalMax).map((piece) => ({
    ...piece,
    score: clamp100((Number(piece.__fusionScore || 0) / topFusion) * 100),
    rawScore: Math.max(0.01, Math.min(1, Number(piece.__fusionScore || 0) / topFusion)),
    meta: {
      ...(piece.meta || {}),
      __fusionScore: Number(piece.__fusionScore || 0),
    },
  }));

  return {
    candidates,
    counts: {
      input: vectorPieces.length + lexicalPieces.length + metadataPieces.length,
      fused: merged.size,
      vector: vectorPieces.length,
      lexical: lexicalPieces.length,
      metadata: metadataPieces.length,
      exactEntity: candidates.filter((piece) => (piece?.meta as any)?.__exactEntityMatch === true).length,
      exactPhrase: candidates.filter((piece) => (piece?.meta as any)?.__exactPhraseMatch === true).length,
      exactSection: candidates.filter((piece) => (piece?.meta as any)?.__exactSectionMatch === true).length,
    },
  };
}
