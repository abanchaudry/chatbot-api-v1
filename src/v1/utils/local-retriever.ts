import type { D1Database } from "@cloudflare/workers-types";

import type { Env } from "../types/env";
import {
  retrieveVector,
  type Piece,
} from "./ask-helper";
import type { QueryPlan } from "./query-planner";
import { chunkDb } from "../services/db/chunk.db";

type LocalChunkRow = {
  chunk_id: string;
  content: string;
  topic?: string;
  first_sentence?: string;
  section_number?: string;
  section?: string;
  file_id?: string;
  file_name?: string;
  dataset?: string;
  tags?: string[] | string | null;
  matchMode?: string;
};

export type LocalRetrievalResult = {
  vectorPieces: Piece[];
  lexicalPieces: Piece[];
  metadataPieces: Piece[];
};

function normalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTags(tags: LocalChunkRow["tags"]): string[] {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || "").trim()).filter(Boolean);
  if (!tags) return [];
  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildLocalDbPiece(
  row: LocalChunkRow,
  plan: QueryPlan,
  origin: "lexical" | "metadata"
): Piece {
  const tags = parseTags(row.tags);
  const searchable = normalize(
    [
      String(row.section || ""),
      String(row.section_number || ""),
      String(row.topic || ""),
      String(row.first_sentence || ""),
      String(row.content || "").slice(0, 1200),
      tags.join(" "),
    ].join(" ")
  );

  const exactEntityMatch = plan.entities.some((entity) => searchable.includes(normalize(entity)));
  const exactPhraseMatch = plan.exactPhrases.some((phrase) => searchable.includes(normalize(phrase)));
  const exactSectionMatch = !!plan.sectionRef && searchable.includes(normalize(plan.sectionRef));
  const keywordHits = plan.keywords.filter((keyword) => searchable.includes(keyword)).length;

  let score = origin === "metadata" ? 75 : 70;
  if (exactEntityMatch) score += 20;
  if (exactPhraseMatch) score += 15;
  if (exactSectionMatch) score += 20;
  if (keywordHits >= 1) score += 10;
  if (keywordHits >= 2) score += 8;
  if (String(row.content || "").length < 80) score -= 12;

  return {
    sourceType: "vector",
    sourceId: String(row.chunk_id || ""),
    score: Math.max(0, Math.min(100, Math.round(score))),
    rawScore: Math.max(0.01, Math.min(1, score / 100)),
    title: String(row.file_name || row.section || row.topic || row.first_sentence || "").trim(),
    section: String(row.section_number || row.section || "").trim(),
    text: String(row.content || "").trim(),
    meta: {
      fileId: row.file_id || null,
      file_name: row.file_name || null,
      dataset: row.dataset || "admin",
      tags,
      first_sentence: row.first_sentence || null,
      section_number: row.section_number || null,
      parent_id: (row as any).parent_id || null,
      __origin: origin,
      __matchMode: row.matchMode || null,
      __exactEntityMatch: exactEntityMatch,
      __exactPhraseMatch: exactPhraseMatch,
      __exactSectionMatch: exactSectionMatch,
    },
  };
}

function enrichVectorPiece(piece: Piece, plan: QueryPlan): Piece {
  const searchable = normalize(
    [
      String(piece.title || ""),
      String(piece.section || ""),
      String(piece.text || "").slice(0, 1200),
      JSON.stringify(piece.meta?.tags || []),
      String(piece.meta?.first_sentence || ""),
    ].join(" ")
  );

  const exactEntityMatch = plan.entities.some((entity) => searchable.includes(normalize(entity)));
  const exactPhraseMatch = plan.exactPhrases.some((phrase) => searchable.includes(normalize(phrase)));
  const exactSectionMatch = !!plan.sectionRef && searchable.includes(normalize(plan.sectionRef));

  return {
    ...piece,
    meta: {
      ...(piece.meta || {}),
      dataset: piece.meta?.dataset || "admin",
      __origin: "vector",
      __exactEntityMatch: exactEntityMatch,
      __exactPhraseMatch: exactPhraseMatch,
      __exactSectionMatch: exactSectionMatch,
    },
  };
}

export async function retrieveLocalCandidates(args: {
  db: D1Database;
  env: Env["Bindings"];
  apiKey: string;
  embedding: number[] | null;
  question: string;
  plan: QueryPlan;
  vectorTopK: number;
  lexicalTopK: number;
  metadataTopK: number;
  activeDatasets?: Array<"admin" | "pdf" | "web">;
  clientId?: string;
  byokConfig?: { cfAccountId: string; cfApiToken: string; indexName?: string };
}): Promise<LocalRetrievalResult> {
  const {
    db,
    env,
    apiKey,
    embedding,
    question,
    plan,
    vectorTopK,
    lexicalTopK,
    metadataTopK,
    activeDatasets = ["admin", "pdf", "web"],
    clientId = "default",
    byokConfig,
  } = args;

  const [vectorPieces, lexicalRows, metadataRows] = await Promise.all([
    embedding?.length ? retrieveVector(env, apiKey, embedding, vectorTopK, activeDatasets, clientId, byokConfig).catch((e) => { console.warn("vectorSearch error:", e.message); return []; }) : Promise.resolve([] as Piece[]),
    chunkDb.lexicalSearch(db, {
      query: plan.searchQuery || question,
      terms: plan.keywords,
      exactPhrases: plan.exactPhrases,
      maxResults: lexicalTopK,
      datasets: activeDatasets,
      clientId,
    }).catch((e) => { console.warn("lexicalSearch error:", e.message); return []; }),
    chunkDb.metadataSearch(db, {
      entities: plan.entities,
      exactPhrases: plan.exactPhrases,
      sectionRef: plan.sectionRef,
      maxResults: metadataTopK,
      datasets: activeDatasets,
      clientId,
    }).catch((e) => { console.warn("metadataSearch error:", e.message); return []; }),
  ]);

  return {
    vectorPieces: vectorPieces.map((piece) => enrichVectorPiece(piece, plan)),
    lexicalPieces: (lexicalRows || []).map((row) =>
      buildLocalDbPiece(row as LocalChunkRow, plan, "lexical")
    ),
    metadataPieces: (metadataRows || []).map((row) =>
      buildLocalDbPiece(row as LocalChunkRow, plan, "metadata")
    ),
  };
}

/**
 * Phase 4: Parent-Child Hierarchical Chunk Expansion
 * Expands matching small leaf chunks (Tier 3) into their full parent context (Tier 2/1)
 */
export async function expandParentChunks(
  db: D1Database,
  pieces: Piece[]
): Promise<Piece[]> {
  if (!pieces || pieces.length === 0) return pieces;

  const parentIdsToFetch = new Set<string>();

  for (const p of pieces) {
    const parentId = p.meta?.parent_id || p.meta?.parentId;
    if (parentId && typeof parentId === "string" && parentId.trim().length > 0) {
      parentIdsToFetch.add(parentId.trim());
    }
  }

  if (parentIdsToFetch.size === 0) return pieces;

  const idsArray = Array.from(parentIdsToFetch);
  const placeholders = idsArray.map(() => "?").join(",");

  try {
    const { results } = await db
      .prepare(
        `SELECT id, chunk_id, content, section, tier FROM document_chunks WHERE id IN (${placeholders}) OR chunk_id IN (${placeholders})`
      )
      .bind(...idsArray, ...idsArray)
      .all();

    const parentMap = new Map<string, any>();
    if (results && results.length > 0) {
      for (const row of results as any[]) {
        if (row.id) parentMap.set(row.id, row);
        if (row.chunk_id) parentMap.set(row.chunk_id, row);
      }
    }

    // Also check chunks table for parents
    const missingIds = idsArray.filter((id) => !parentMap.has(id));
    if (missingIds.length > 0) {
      const missingPlaceholders = missingIds.map(() => "?").join(",");
      const chunksRes = await db
        .prepare(
          `SELECT chunk_id, content, section, tier FROM chunks WHERE chunk_id IN (${missingPlaceholders})`
        )
        .bind(...missingIds)
        .all();
      if (chunksRes.results && chunksRes.results.length > 0) {
        for (const row of chunksRes.results as any[]) {
          if (row.chunk_id) parentMap.set(row.chunk_id, row);
        }
      }
    }

    if (parentMap.size > 0) {
      return pieces.map((p) => {
        const parentId = p.meta?.parent_id || p.meta?.parentId;
        if (parentId && parentMap.has(parentId)) {
          const parentRow = parentMap.get(parentId);
          return {
            ...p,
            text: parentRow.content || p.text, // Expand text to full parent paragraph context
            title: parentRow.section || p.title,
            meta: {
              ...(p.meta || {}),
              __smallLeafMatch: p.text,
              __parentExpanded: true,
              __parentTier: parentRow.tier || "parent",
            },
          };
        }
        return p;
      });
    }
  } catch (err: any) {
    console.warn("Parent chunk expansion warning (non-blocking):", err.message);
  }

  return pieces;
}

