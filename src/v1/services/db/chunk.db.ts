
import type { D1Database } from "@cloudflare/workers-types";

const SECTION_RE = /\b(?:NAC|NRS)?\s*624\.\d{1,5}(?:\([^)]+\))?(?:\s*[–-]\s*624\.\d{1,5})?\b/i;
const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "about",
  "apogee",
  "assistant",
  "can",
  "do",
  "for",
  "find",
  "give",
  "help",
  "i",
  "in",
  "is",
  "me",
  "of",
  "please",
  "who",
  "share",
  "show",
  "statement",
  "tell",
  "the",
  "to",
  "what",
  "where",
  "with",
  "you",
]);

function extractSectionRaw(text: string): string | null {
  const m = text.match(SECTION_RE);
  return m ? m[0] : null;
}

function canonicalizeSection(s: string): { withPrefix?: string; numberOnly: string } {
  const upper = s.trim().toUpperCase().replace(/\s+/g, " ");
  const hasPrefix = /^(NRS|NAC)\s/.test(upper);
  const numberMatch = upper.match(/624\.\d{1,5}/);
  const numberOnly = numberMatch ? numberMatch[0] : upper;
  return hasPrefix ? { withPrefix: upper, numberOnly } : { numberOnly };
}

function normalizeSearchText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchTerms(message: string, maxTerms: number): string[] {
  const rawTerms = normalizeSearchText(message).match(/[a-z0-9.]{2,}/g) || [];
  return Array.from(
    new Set(rawTerms.filter((term) => !SEARCH_STOP_WORDS.has(term)))
  ).slice(0, maxTerms);
}

function extractSearchPhrases(message: string): string[] {
  const normalized = normalizeSearchText(message);
  if (!normalized) return [];

  const phrases = new Set<string>();
  const directMatch =
    normalized.match(/^(?:what is|what s|whats|show me|tell me|give me|share|find)\s+(?:the\s+)?(.+)$/)?.[1] ||
    normalized.match(/^(?:where can i find|do you have|can you share|can you tell me)\s+(?:the\s+)?(.+)$/)?.[1] ||
    "";

  if (directMatch) {
    phrases.add(directMatch.trim());
    const trimmed = directMatch.replace(/\b(?:of|for|about)\s+[a-z0-9\s]{2,40}$/g, "").trim();
    if (trimmed) phrases.add(trimmed);
  }

  return Array.from(phrases).filter(Boolean);
}

async function tableExists(db: D1Database, name: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .bind(name)
    .first();
  return !!row;
}

type SearchChunkRow = {
  chunk_id: string;
  content: string;
  topic?: string;
  first_sentence?: string;
  section_number?: string;
  section?: string;
  file_id?: string;
  tags?: string[] | string | null;
  matchMode?: string;
};

export const chunkDb = {
  async getChunksByFileId(db: D1Database, fileId: string, page = 1, perPage = 50) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 200) : 50;
    const offset = (safePage - 1) * safePerPage;

    const data = await db
      .prepare(
        `SELECT
           c.chunk_id,
           c.file_id,
           f.file_name,
           c.section,
           c.section_number,
           c.topic,
           c.first_sentence,
           c.content,
           c.tags,
           c.chunk_index,
           c.created_at
         FROM chunks c
         LEFT JOIN files f ON f.file_id = c.file_id
         WHERE c.file_id = ?
         ORDER BY c.chunk_index ASC
         LIMIT ? OFFSET ?`
      )
      .bind(fileId, String(safePerPage), String(offset))
      .all();

    const totalRow: any = await db
      .prepare(`SELECT COUNT(*) AS total FROM chunks WHERE file_id = ?`)
      .bind(fileId)
      .first();

    const total = Number(totalRow?.total || 0);
    return { results: data.results || [], total };
  },

  async getAllChunksPaged(db: D1Database, page = 1, perPage = 50, search = "") {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 200) : 50;
    const offset = (safePage - 1) * safePerPage;

    const q = (search || "").trim();
    const hasSearch = q.length > 0;

    const where = hasSearch
      ? `WHERE (
          LOWER(c.content) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.topic) LIKE '%' || LOWER(?) || '%'
          OR LOWER(f.file_name) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section_number) LIKE '%' || LOWER(?) || '%'
        )`
      : "";

    const countSql = `
      SELECT COUNT(1) AS total
      FROM chunks c
      LEFT JOIN files f ON f.file_id = c.file_id
      ${where}
    `;

    const dataSql = `
      SELECT
        c.chunk_id,
        c.file_id,
        f.file_name,
        c.section,
        c.section_number,
        c.topic,
        c.first_sentence,
        c.content,
        c.tags,
        c.chunk_index,
        c.created_at
      FROM chunks c
      LEFT JOIN files f ON f.file_id = c.file_id
      ${where}
      ORDER BY c.created_at DESC, c.chunk_index ASC
      LIMIT ? OFFSET ?
    `;

    const args = hasSearch ? [q, q, q, q, q] : [];
    const countRow: any = await db.prepare(countSql).bind(...args).first();
    const total = Number(countRow?.total || 0);

    const res = await db.prepare(dataSql).bind(...args, String(safePerPage), String(offset)).all();
    return { results: res.results || [], total };
  },

  async hybridSearch(db: D1Database, message: string, maxResults = 10) {
    const MAX_TERMS = 30;

    const rawSection = extractSectionRaw(message || "");
    let exactMatches: any[] = [];

    if (rawSection) {
      const sec = canonicalizeSection(rawSection);

      if (sec.withPrefix) {
        const exactRes = await db
          .prepare(
            `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
             FROM chunks c
             WHERE c.section_number = ?
             ORDER BY LENGTH(c.content) ASC
             LIMIT ?`
          )
          .bind(sec.withPrefix, maxResults)
          .all();

        exactMatches = exactRes.results || [];

        if (exactMatches.length < maxResults) {
          const likeRes = await db
            .prepare(
              `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
               FROM chunks c
               WHERE c.section_number LIKE ?
               ORDER BY LENGTH(c.content) ASC
               LIMIT ?`
            )
            .bind(`%${sec.numberOnly}`, maxResults)
            .all();

          const more = (likeRes.results || []).filter((r: any) => !exactMatches.some((e) => e.chunk_id === r.chunk_id));
          exactMatches = [...exactMatches, ...more].slice(0, maxResults);
        }
      } else {
        const likeRes = await db
          .prepare(
            `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
             FROM chunks c
             WHERE c.section_number LIKE ?
             ORDER BY LENGTH(c.content) ASC
             LIMIT ?`
          )
          .bind(`%${sec.numberOnly}`, maxResults)
          .all();

        exactMatches = likeRes.results || [];
      }

      if (exactMatches.length >= maxResults) {
        return { total: exactMatches.length, exactMatches, hybridMatches: [], all: exactMatches, used: "exact" };
      }
    }

    const phrases = extractSearchPhrases(message);
    const terms = extractSearchTerms(message, MAX_TERMS);
    const primaryPhrase = phrases[0] || terms[0] || "";

    if (!terms.length) {
      return { total: exactMatches.length, exactMatches, hybridMatches: [], all: exactMatches, used: "none" };
    }

    const hasFts = await tableExists(db, "chunks_fts");
    if (hasFts) {
      const numberToken = rawSection ? canonicalizeSection(rawSection).numberOnly : null;
      const ftsPieces = [
        ...phrases.map((phrase) => `"${phrase}"`),
        ...terms.filter((t) => t !== numberToken).map((t) => `${t}*`),
      ];
      if (numberToken) ftsPieces.unshift(`"${numberToken}"`);
      const ftsQuery = Array.from(new Set(ftsPieces)).join(" OR ");

      const ftsSql = `
        SELECT ch.chunk_id, ch.content, ch.topic, ch.first_sentence, ch.section_number, ch.section, ch.file_id, ch.tags, rank
        FROM chunks_fts
        JOIN chunks ch ON ch.rowid = chunks_fts.rowid
        WHERE chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;

      try {
        const r = await db.prepare(ftsSql).bind(ftsQuery, maxResults * 2).all();
        const ftsResults = r.results || [];
        if (ftsResults.length) {
          const hybridMatches = ftsResults.filter((r: any) => !exactMatches.some((e) => e.chunk_id === r.chunk_id));
          const combined = [...exactMatches, ...hybridMatches].slice(0, maxResults);
          return { total: combined.length, exactMatches, hybridMatches, all: combined, used: "fts" };
        }
      } catch {}
    }

    const searchColumns = [
      "LOWER(c.content)",
      "LOWER(COALESCE(c.section, ''))",
      "LOWER(COALESCE(c.topic, ''))",
      "LOWER(COALESCE(c.first_sentence, ''))",
      "LOWER(COALESCE(c.tags, ''))",
    ];
    const likeClause = terms
      .map(
        () => `(${searchColumns
          .map((column) => `${column} LIKE '%' || ? || '%'`)
          .join(" OR ")})`
      )
      .join(" OR ");
    const searchBlob = `${searchColumns.join(" || ' ' || ")}`;
    const sql = `
      SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
      FROM chunks c
      WHERE (${likeClause})
        AND LENGTH(c.content) <= 5000
      ORDER BY
        CASE WHEN ? != '' AND ${searchBlob} LIKE '%' || ? || '%' THEN 3 ELSE 0 END DESC,
        CASE WHEN ? != '' AND LOWER(COALESCE(c.section, '')) LIKE '%' || ? || '%' THEN 2 ELSE 0 END DESC,
        CASE WHEN ? != '' AND LOWER(COALESCE(c.topic, '')) LIKE '%' || ? || '%' THEN 2 ELSE 0 END DESC,
        CASE WHEN ? != '' AND LOWER(COALESCE(c.first_sentence, '')) LIKE '%' || ? || '%' THEN 1 ELSE 0 END DESC,
        LENGTH(c.content) ASC,
        c.chunk_id ASC
      LIMIT ?;
    `;

    const bindArgs = [
      ...terms.flatMap((term) => searchColumns.map(() => term)),
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      primaryPhrase,
      maxResults,
    ];
    const likeRes = await db.prepare(sql).bind(...bindArgs).all();
    const likeRows = likeRes.results || [];

    const hybridMatches = likeRows.filter((r: any) => !exactMatches.some((e) => e.chunk_id === r.chunk_id));
    const combined = [...exactMatches, ...hybridMatches].slice(0, maxResults);

    return { total: combined.length, exactMatches, hybridMatches, all: combined, used: "like" };
  },

  async lexicalSearch(
    db: D1Database,
    args: {
      query: string;
      terms: string[];
      exactPhrases: string[];
      maxResults: number;
    }
  ): Promise<SearchChunkRow[]> {
    const terms = Array.from(new Set((args.terms || []).filter(Boolean))).slice(0, 12);
    const phrases = Array.from(new Set((args.exactPhrases || []).filter(Boolean))).slice(0, 6);
    const maxResults = Math.max(1, Math.min(args.maxResults || 12, 30));
    const hasFts = await tableExists(db, "chunks_fts");

    if (hasFts && (terms.length || phrases.length)) {
      const ftsQuery = Array.from(
        new Set([
          ...phrases.map((phrase) => `"${normalizeSearchText(phrase)}"`),
          ...terms.map((term) => `${normalizeSearchText(term)}*`),
        ])
      ).join(" OR ");

      if (ftsQuery) {
        try {
          const res = await db.prepare(
            `SELECT ch.chunk_id, ch.content, ch.topic, ch.first_sentence, ch.section_number, ch.section, ch.file_id, ch.tags
             FROM chunks_fts
             JOIN chunks ch ON ch.rowid = chunks_fts.rowid
             WHERE chunks_fts MATCH ?
             ORDER BY rank
             LIMIT ?`
          ).bind(ftsQuery, maxResults * 2).all();

          const rows = (res.results || []) as SearchChunkRow[];
          if (rows.length) {
            return rows.slice(0, maxResults).map((row) => ({ ...row, matchMode: "fts" }));
          }
        } catch {}
      }
    }

    if (!terms.length && !phrases.length) return [];

    const searchColumns = [
      "LOWER(COALESCE(c.section, ''))",
      "LOWER(COALESCE(c.topic, ''))",
      "LOWER(COALESCE(c.first_sentence, ''))",
      "LOWER(COALESCE(c.tags, ''))",
      "LOWER(COALESCE(c.content, ''))",
    ];

    const phraseClauses = phrases.map(
      () => `(${searchColumns.map((column) => `${column} LIKE '%' || ? || '%'`).join(" OR ")})`
    );
    const termClauses = terms.map(
      () => `(${searchColumns.map((column) => `${column} LIKE '%' || ? || '%'`).join(" OR ")})`
    );
    const whereParts = [...phraseClauses, ...termClauses];
    const whereSql = whereParts.length ? whereParts.join(" OR ") : "1=0";
    const bindArgs = [
      ...phrases.flatMap((phrase) => searchColumns.map(() => normalizeSearchText(phrase))),
      ...terms.flatMap((term) => searchColumns.map(() => normalizeSearchText(term))),
      maxResults,
    ];

    const res = await db.prepare(
      `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
       FROM chunks c
       WHERE (${whereSql})
         AND LENGTH(c.content) <= 8000
       ORDER BY LENGTH(c.content) ASC, c.chunk_id ASC
       LIMIT ?`
    ).bind(...bindArgs).all();

    const legacyRows = ((res.results || []) as SearchChunkRow[]).map((row) => ({ ...row, matchMode: "like" }));

    // Also search document_chunks table for multi-format 3-tier chunks
    try {
      const docTermClauses = terms.map(() => `LOWER(content) LIKE '%' || ? || '%'`).join(" OR ");
      if (docTermClauses) {
        const docRes = await db.prepare(
          `SELECT id as chunk_id, content, category as topic, tier as section, parent_id
           FROM document_chunks
           WHERE (${docTermClauses})
           LIMIT ?`
        ).bind(...terms.map((t) => normalizeSearchText(t)), maxResults).all();

        const docRows = (docRes.results || []).map((r: any) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          topic: r.topic,
          section: r.section,
          tags: [r.topic, r.section],
          matchMode: "like_doc",
          parent_id: r.parent_id,
        }));

        return [...docRows, ...legacyRows].slice(0, maxResults);
      }
    } catch {}

    return legacyRows;
  },


  async metadataSearch(
    db: D1Database,
    args: {
      entities: string[];
      exactPhrases: string[];
      sectionRef: string | null;
      maxResults: number;
    }
  ): Promise<SearchChunkRow[]> {
    const entities = Array.from(new Set((args.entities || []).map(normalizeSearchText).filter(Boolean))).slice(0, 8);
    const phrases = Array.from(new Set((args.exactPhrases || []).map(normalizeSearchText).filter(Boolean))).slice(0, 8);
    const maxResults = Math.max(1, Math.min(args.maxResults || 10, 20));
    const sectionRef = normalizeSearchText(args.sectionRef || "");

    if (!entities.length && !phrases.length && !sectionRef) return [];

    const metadataColumns = [
      "LOWER(COALESCE(c.section, ''))",
      "LOWER(COALESCE(c.topic, ''))",
      "LOWER(COALESCE(c.first_sentence, ''))",
      "LOWER(COALESCE(c.tags, ''))",
      "LOWER(COALESCE(c.section_number, ''))",
    ];

    const bindings: any[] = [];
    const whereClauses: string[] = [];

    for (const entity of entities) {
      whereClauses.push(`(${metadataColumns.map((column) => `${column} LIKE '%' || ? || '%'`).join(" OR ")})`);
      bindings.push(...metadataColumns.map(() => entity));
    }

    for (const phrase of phrases) {
      whereClauses.push(`(${metadataColumns.map((column) => `${column} LIKE '%' || ? || '%'`).join(" OR ")})`);
      bindings.push(...metadataColumns.map(() => phrase));
    }

    if (sectionRef) {
      whereClauses.push(`LOWER(COALESCE(c.section_number, '')) LIKE '%' || ? || '%'`);
      bindings.push(sectionRef);
    }

    const res = await db.prepare(
      `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
       FROM chunks c
       WHERE (${whereClauses.join(" OR ")})
       ORDER BY
         CASE WHEN ? != '' AND LOWER(COALESCE(c.section_number, '')) = ? THEN 4 ELSE 0 END DESC,
         CASE WHEN ? != '' AND LOWER(COALESCE(c.section, '')) LIKE '%' || ? || '%' THEN 3 ELSE 0 END DESC,
         CASE WHEN ? != '' AND LOWER(COALESCE(c.first_sentence, '')) LIKE '%' || ? || '%' THEN 3 ELSE 0 END DESC,
         CASE WHEN ? != '' AND LOWER(COALESCE(c.tags, '')) LIKE '%' || ? || '%' THEN 2 ELSE 0 END DESC,
         LENGTH(c.content) DESC,
         c.chunk_id ASC
       LIMIT ?`
    ).bind(
      ...bindings,
      sectionRef,
      sectionRef,
      phrases[0] || entities[0] || "",
      phrases[0] || entities[0] || "",
      phrases[0] || entities[0] || "",
      phrases[0] || entities[0] || "",
      phrases[0] || entities[0] || "",
      phrases[0] || entities[0] || "",
      maxResults
    ).all();

    const legacyRows = ((res.results || []) as SearchChunkRow[]).map((row) => ({ ...row, matchMode: "metadata" }));

    // Also search document_chunks table
    try {
      const allTerms = [...entities, ...phrases];
      if (allTerms.length > 0) {
        const docClauses = allTerms.map(() => `LOWER(content) LIKE '%' || ? || '%' OR LOWER(category) LIKE '%' || ? || '%'`).join(" OR ");
        const bindValues = allTerms.flatMap((t) => [t, t]);
        const docRes = await db.prepare(
          `SELECT id as chunk_id, content, category as topic, tier as section, parent_id
           FROM document_chunks
           WHERE (${docClauses})
           LIMIT ?`
        ).bind(...bindValues, maxResults).all();

        const docRows = (docRes.results || []).map((r: any) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          topic: r.topic,
          section: r.section,
          tags: [r.topic, r.section],
          matchMode: "metadata_doc",
          parent_id: r.parent_id,
        }));

        return [...docRows, ...legacyRows].slice(0, maxResults);
      }
    } catch {}

    return legacyRows;
  },


  async findBySectionNumber(db: D1Database, sectionNumber: string, maxResults = 10) {
    const raw = extractSectionRaw(sectionNumber || "");
    if (!raw) return [];
    const sec = canonicalizeSection(raw);

    if (sec.withPrefix) {
      const res = await db
        .prepare(
          `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
           FROM chunks c
           WHERE c.section_number = ?
           ORDER BY LENGTH(c.content) ASC
           LIMIT ?`
        )
        .bind(sec.withPrefix, maxResults)
        .all();

      const rows = res.results || [];
      if (rows.length >= maxResults) return rows;
    }

    const likeRes = await db
      .prepare(
        `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.tags
         FROM chunks c
         WHERE c.section_number LIKE ?
         ORDER BY LENGTH(c.content) ASC
         LIMIT ?`
      )
      .bind(`%${sec.numberOnly}`, maxResults)
      .all();

    return likeRes.results || [];
  },
};
