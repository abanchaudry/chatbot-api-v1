
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
  "get",
  "give",
  "help",
  "how",
  "hows",
  "how's",
  "i",
  "in",
  "is",
  "me",
  "of",
  "please",
  "who",
  "whos",
  "who's",
  "share",
  "show",
  "statement",
  "tell",
  "the",
  "to",
  "what",
  "whats",
  "what's",
  "where",
  "wheres",
  "where's",
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
    .replace(/[^a-z0-9.\s]/g, " ")
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
  file_name?: string;
  dataset?: string;
  tags?: string[] | string | null;
  matchMode?: string;
};

export const chunkDb = {
  async getChunksByFileId(db: D1Database, fileId: string, page = 1, perPage = 50, search = "") {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 200) : 50;
    const offset = (safePage - 1) * safePerPage;

    const q = (search || "").trim();
    const hasSearch = q.length > 0;

    const searchClause = hasSearch
      ? `AND (
          LOWER(c.content) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.topic) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section_number) LIKE '%' || LOWER(?) || '%'
        )`
      : "";

    const countArgs = hasSearch ? [fileId, q, q, q, q] : [fileId];
    const dataArgs = hasSearch ? [fileId, q, q, q, q, String(safePerPage), String(offset)] : [fileId, String(safePerPage), String(offset)];

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
           c.tier,
           c.parent_id,
           c.created_at
         FROM chunks c
         LEFT JOIN files f ON f.file_id = c.file_id
         WHERE c.file_id = ? ${searchClause}
         ORDER BY c.chunk_index ASC
         LIMIT ? OFFSET ?`
      )
      .bind(...dataArgs)
      .all();

    const totalRow: any = await db
      .prepare(`SELECT COUNT(1) AS total FROM chunks c WHERE c.file_id = ? ${searchClause}`)
      .bind(...countArgs)
      .first();

    const total = Number(totalRow?.total || 0);
    return { results: data.results || [], total };
  },

  async getAllChunksPaged(db: D1Database, page = 1, perPage = 50, search = "", clientId?: string) {
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 200) : 50;
    const offset = (safePage - 1) * safePerPage;

    const q = (search || "").trim();
    const hasSearch = q.length > 0;
    const targetClient = clientId || "default";

    let where = `WHERE (c.client_id = ? OR (c.client_id IS NULL AND ? = 'default'))`;
    const args: any[] = [targetClient, targetClient];

    if (hasSearch) {
      where += ` AND (
          LOWER(c.content) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.topic) LIKE '%' || LOWER(?) || '%'
          OR LOWER(f.file_name) LIKE '%' || LOWER(?) || '%'
          OR LOWER(c.section_number) LIKE '%' || LOWER(?) || '%'
        )`;
      args.push(q, q, q, q, q);
    }

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
        COALESCE(c.dataset, f.dataset, 'admin') AS dataset,
        c.section,
        c.section_number,
        c.topic,
        c.first_sentence,
        c.content,
        c.tags,
        c.chunk_index,
        c.tier,
        c.parent_id,
        c.created_at
      FROM chunks c
      LEFT JOIN files f ON f.file_id = c.file_id
      ${where}
      ORDER BY c.created_at DESC, c.chunk_index ASC
      LIMIT ? OFFSET ?
    `;

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

      const secRes = await db
        .prepare(
          `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, f.file_name, c.tags
           FROM chunks c
           LEFT JOIN files f ON f.file_id = c.file_id
           WHERE c.section_number = ?
              OR c.section_number LIKE ?
              OR c.content LIKE ?
           ORDER BY LENGTH(c.content) ASC
           LIMIT ?`
        )
        .bind(sec.withPrefix || sec.numberOnly, `%${sec.numberOnly}`, `%${sec.numberOnly}%`, maxResults)
        .all();

      exactMatches = secRes.results || [];

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
        SELECT ch.chunk_id, ch.content, ch.topic, ch.first_sentence, ch.section_number, ch.section, ch.file_id, f.file_name, ch.tags, rank
        FROM chunks_fts
        JOIN chunks ch ON ch.rowid = chunks_fts.rowid
        LEFT JOIN files f ON f.file_id = ch.file_id
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
      SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, f.file_name, c.tags
      FROM chunks c
      LEFT JOIN files f ON f.file_id = c.file_id
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
      datasets?: string[];
      clientId?: string;
    }
  ): Promise<SearchChunkRow[]> {
    const terms = Array.from(new Set((args.terms || []).filter(Boolean))).slice(0, 12);
    const phrases = Array.from(new Set((args.exactPhrases || []).filter(Boolean))).slice(0, 6);
    const maxResults = Math.max(1, Math.min(args.maxResults || 12, 30));
    const activeDatasets = (args.datasets || []).filter(Boolean);
    const targetClient = args.clientId || "default";
    const hasFts = await tableExists(db, "chunks_fts");

    let datasetFtsClause = "";
    const datasetFtsArgs: string[] = [];
    if (activeDatasets.length > 0) {
      const placeholders = activeDatasets.map(() => "?").join(",");
      datasetFtsClause = `AND COALESCE(ch.dataset, f.dataset, 'admin') IN (${placeholders})`;
      datasetFtsArgs.push(...activeDatasets);
    }

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
            `SELECT ch.chunk_id, ch.content, ch.topic, ch.first_sentence, ch.section_number, ch.section, ch.file_id, f.file_name, COALESCE(ch.dataset, f.dataset, 'admin') AS dataset, ch.tags
             FROM chunks_fts
             JOIN chunks ch ON ch.rowid = chunks_fts.rowid
             LEFT JOIN files f ON f.file_id = ch.file_id
             WHERE chunks_fts MATCH ?
             ${datasetFtsClause}
               AND (ch.client_id = ? OR (ch.client_id IS NULL AND ? = 'default'))
             ORDER BY rank
             LIMIT ?`
          ).bind(ftsQuery, ...datasetFtsArgs, targetClient, targetClient, maxResults * 2).all();

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

    let datasetLikeClause = "";
    const datasetLikeArgs: string[] = [];
    if (activeDatasets.length > 0) {
      const placeholders = activeDatasets.map(() => "?").join(",");
      datasetLikeClause = `AND COALESCE(c.dataset, f.dataset, 'admin') IN (${placeholders})`;
      datasetLikeArgs.push(...activeDatasets);
    }

    const bindArgs = [
      ...phrases.flatMap((phrase) => searchColumns.map(() => normalizeSearchText(phrase))),
      ...terms.flatMap((term) => searchColumns.map(() => normalizeSearchText(term))),
      ...datasetLikeArgs,
      targetClient,
      targetClient,
      maxResults,
    ];

    const res = await db.prepare(
      `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.parent_id, f.file_name, COALESCE(c.dataset, f.dataset, 'admin') AS dataset, c.tags
       FROM chunks c
       LEFT JOIN files f ON f.file_id = c.file_id
       WHERE (${whereSql})
         ${datasetLikeClause}
         AND (c.client_id = ? OR (c.client_id IS NULL AND ? = 'default'))
         AND LENGTH(c.content) <= 8000
       ORDER BY
         CASE
           WHEN (LOWER(c.section) LIKE '%faq%' OR LOWER(c.content) LIKE '%faqs:%' OR LOWER(c.content) LIKE '%q:%') AND LOWER(c.section) NOT LIKE '%terms%' AND LOWER(c.section) NOT LIKE '%privacy%' THEN 5
           WHEN (LOWER(c.section) LIKE '%project%' OR LOWER(c.section) LIKE '%portfolio%' OR LOWER(c.section) LIKE '%case stud%' OR LOWER(c.content) LIKE '%case study%' OR LOWER(c.content) LIKE '%portfolio%') AND LOWER(c.section) NOT LIKE '%terms%' AND LOWER(c.section) NOT LIKE '%privacy%' AND LOWER(c.section) NOT LIKE '%disclaimer%' THEN 4
           WHEN LOWER(c.section) LIKE '%service%' OR LOWER(c.section) LIKE '%solution%' OR LOWER(c.section) LIKE '%offering%' OR LOWER(c.section) LIKE '%tool%' OR LOWER(c.section) LIKE '%development%' THEN 3
           ELSE 1
         END DESC,
         c.chunk_id ASC
       LIMIT ?`
    ).bind(...bindArgs).all();

    const legacyRows = ((res.results || []) as SearchChunkRow[]).map((row) => ({ ...row, matchMode: "like" }));

    // Also search document_chunks table for multi-format 3-tier chunks
    try {
      const docTermClauses = terms.map(() => `LOWER(dc.content) LIKE '%' || ? || '%'`).join(" OR ");
      if (docTermClauses) {
        let docDatasetClause = "";
        const docDatasetArgs: string[] = [];
        if (activeDatasets.length > 0) {
          const placeholders = activeDatasets.map(() => "?").join(",");
          docDatasetClause = `AND COALESCE(f.dataset, 'admin') IN (${placeholders})`;
          docDatasetArgs.push(...activeDatasets);
        }

        const docRes = await db.prepare(
          `SELECT dc.id as chunk_id, dc.content, dc.category as topic, dc.tier as section, dc.parent_id, COALESCE(f.dataset, 'admin') as dataset
           FROM document_chunks dc
           LEFT JOIN files f ON f.file_id = dc.document_id
           WHERE (${docTermClauses})
             ${docDatasetClause}
             AND (f.client_id = ? OR (f.client_id IS NULL AND ? = 'default'))
           LIMIT ?`
        ).bind(...terms.map((t) => normalizeSearchText(t)), ...docDatasetArgs, targetClient, targetClient, maxResults).all();

        const docRows = (docRes.results || []).map((r: any) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          topic: r.topic,
          section: r.section,
          dataset: r.dataset || "admin",
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
      datasets?: string[];
      clientId?: string;
    }
  ): Promise<SearchChunkRow[]> {
    const entities = Array.from(new Set((args.entities || []).map(normalizeSearchText).filter(Boolean))).slice(0, 8);
    const phrases = Array.from(new Set((args.exactPhrases || []).map(normalizeSearchText).filter(Boolean))).slice(0, 8);
    const maxResults = Math.max(1, Math.min(args.maxResults || 10, 20));
    const sectionRef = normalizeSearchText(args.sectionRef || "");
    const activeDatasets = (args.datasets || []).filter(Boolean);
    const targetClient = args.clientId || "default";

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

    let datasetMetaClause = "";
    if (activeDatasets.length > 0) {
      const placeholders = activeDatasets.map(() => "?").join(",");
      datasetMetaClause = `AND COALESCE(c.dataset, f.dataset, 'admin') IN (${placeholders})`;
      bindings.push(...activeDatasets);
    }

    const res = await db.prepare(
      `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, c.parent_id, f.file_name, COALESCE(c.dataset, f.dataset, 'admin') AS dataset, c.tags
       FROM chunks c
       LEFT JOIN files f ON f.file_id = c.file_id
       WHERE (${whereClauses.join(" OR ")})
         ${datasetMetaClause}
         AND (c.client_id = ? OR (c.client_id IS NULL AND ? = 'default'))
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
      targetClient,
      targetClient,
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
        const docClauses = allTerms.map(() => `LOWER(dc.content) LIKE '%' || ? || '%' OR LOWER(dc.category) LIKE '%' || ? || '%'`).join(" OR ");
        const bindValues = allTerms.flatMap((t) => [t, t]);

        let docDatasetClause = "";
        const docDatasetArgs: string[] = [];
        if (activeDatasets.length > 0) {
          const placeholders = activeDatasets.map(() => "?").join(",");
          docDatasetClause = `AND COALESCE(f.dataset, 'admin') IN (${placeholders})`;
          docDatasetArgs.push(...activeDatasets);
        }

        const docRes = await db.prepare(
          `SELECT dc.id as chunk_id, dc.content, dc.category as topic, dc.tier as section, dc.parent_id, COALESCE(f.dataset, 'admin') as dataset
           FROM document_chunks dc
           LEFT JOIN files f ON f.file_id = dc.document_id
           WHERE (${docClauses})
             ${docDatasetClause}
             AND (f.client_id = ? OR (f.client_id IS NULL AND ? = 'default'))
           LIMIT ?`
        ).bind(...bindValues, ...docDatasetArgs, targetClient, targetClient, maxResults).all();

        const docRows = (docRes.results || []).map((r: any) => ({
          chunk_id: r.chunk_id,
          content: r.content,
          topic: r.topic,
          section: r.section,
          dataset: r.dataset || "admin",
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
          `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, f.file_name, c.tags
           FROM chunks c
           LEFT JOIN files f ON f.file_id = c.file_id
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
        `SELECT c.chunk_id, c.content, c.topic, c.first_sentence, c.section_number, c.section, c.file_id, f.file_name, c.tags
         FROM chunks c
         LEFT JOIN files f ON f.file_id = c.file_id
         WHERE c.section_number LIKE ?
         ORDER BY LENGTH(c.content) ASC
         LIMIT ?`
      )
      .bind(`%${sec.numberOnly}`, maxResults)
      .all();

    return likeRes.results || [];
  },

  async getChunkById(db: D1Database, chunkId: string) {
    return await db
      .prepare(`SELECT * FROM chunks WHERE chunk_id = ?`)
      .bind(chunkId)
      .first();
  },

  async updateChunk(
    db: D1Database,
    chunkId: string,
    updates: { content?: string; topic?: string; section?: string; tags?: string[] | string }
  ) {
    const existing: any = await this.getChunkById(db, chunkId);
    if (!existing) return null;

    const content = updates.content !== undefined ? updates.content : existing.content;
    const topic = updates.topic !== undefined ? updates.topic : existing.topic;
    const section = updates.section !== undefined ? updates.section : existing.section;

    let tagsStr = existing.tags;
    if (updates.tags !== undefined) {
      tagsStr = Array.isArray(updates.tags) ? JSON.stringify(updates.tags) : String(updates.tags);
    }

    const firstSentence = (content.split(/[.!?]/)[0] || "").slice(0, 200);

    await db
      .prepare(
        `UPDATE chunks
         SET content = ?,
             topic = ?,
             section = ?,
             tags = ?,
             first_sentence = ?
         WHERE chunk_id = ?`
      )
      .bind(content, topic, section, tagsStr, firstSentence, chunkId)
      .run();

    return { chunk_id: chunkId, file_id: existing.file_id, content, topic, section, tags: tagsStr, first_sentence: firstSentence };
  },

  async deleteChunk(db: D1Database, chunkId: string) {
    const existing: any = await this.getChunkById(db, chunkId);
    if (!existing) return false;

    await db.prepare(`DELETE FROM chunks WHERE chunk_id = ?`).bind(chunkId).run();
    if (existing.file_id) {
      await db.prepare(`UPDATE files SET chunk_count = MAX(0, chunk_count - 1) WHERE file_id = ?`).bind(existing.file_id).run();
    }
    return true;
  },

  async getRelatedTiers(db: D1Database, chunkId: string) {
    const target: any = await this.getChunkById(db, chunkId);
    if (!target) return null;

    if (!target.file_id) {
      return {
        targetChunkId: chunkId,
        small: target,
        medium: null,
        large: null,
      };
    }

    const res = await db
      .prepare(
        `SELECT chunk_id, file_id, section, section_number, topic, first_sentence, content, tags, tier, parent_id, created_at
         FROM chunks
         WHERE file_id = ?
         ORDER BY rowid ASC`
      )
      .bind(target.file_id)
      .all();

    const fileChunks = (res.results || []) as any[];

    // 1. Direct tier lookup based on tier column and parent_id
    let smallChunk: any = target.tier === "small" ? target : null;
    let mediumChunk: any = target.tier === "medium" ? target : null;
    let largeChunk: any = target.tier === "large" ? target : null;

    if (target.tier === "small") {
      if (target.parent_id) {
        mediumChunk = fileChunks.find(c => c.chunk_id === target.parent_id || c.chunk_id.endsWith(target.parent_id));
        if (mediumChunk && mediumChunk.parent_id) {
          largeChunk = fileChunks.find(c => c.chunk_id === mediumChunk.parent_id || c.chunk_id.endsWith(mediumChunk.parent_id));
        }
      }
    } else if (target.tier === "medium") {
      if (target.parent_id) {
        largeChunk = fileChunks.find(c => c.chunk_id === target.parent_id || c.chunk_id.endsWith(target.parent_id));
      }
      smallChunk = fileChunks.find(c => c.parent_id === target.chunk_id || c.parent_id === target.id);
    } else if (target.tier === "large") {
      mediumChunk = fileChunks.find(c => c.parent_id === target.chunk_id || c.parent_id === target.id);
      if (mediumChunk) {
        smallChunk = fileChunks.find(c => c.parent_id === mediumChunk.chunk_id || c.parent_id === mediumChunk.id);
      }
    }

    // 2. Section & Content heuristic fallback
    const targetFirstLine = (target.content || "").split("\n")[0]?.trim() || "";
    const headerMatch = targetFirstLine.match(/^(?:\d+\.\d+\s+)?[^(:\n]+/i);
    const searchKey = headerMatch ? headerMatch[0].trim() : targetFirstLine.slice(0, 20).trim();

    if (!largeChunk || !mediumChunk || !smallChunk) {
      for (const ch of fileChunks) {
        const sec = (ch.section || "").toLowerCase();
        const content = String(ch.content || "");
        const matchesSearch = searchKey.length >= 3 && content.toLowerCase().includes(searchKey.toLowerCase());

        if (ch.tier === "large" || sec.includes("large chunk") || sec.includes("large") || sec.includes("📄")) {
          if (!largeChunk || matchesSearch) largeChunk = ch;
        } else if (ch.tier === "medium" || sec.includes("medium chunk") || sec.includes("medium") || sec.includes("📝")) {
          if (!mediumChunk || matchesSearch) mediumChunk = ch;
        } else {
          if (!smallChunk || matchesSearch) smallChunk = ch;
        }
      }
    }

    if (!largeChunk || !mediumChunk) {
      const matchingSiblings = fileChunks.filter(
        (ch) =>
          ch.chunk_id !== target.chunk_id &&
          (!searchKey || String(ch.content || "").toLowerCase().includes(searchKey.toLowerCase()))
      );
      const sortedByLen = [...matchingSiblings].sort((a, b) => b.content.length - a.content.length);

      if (!largeChunk && sortedByLen.length >= 1) largeChunk = sortedByLen[0];
      if (!mediumChunk && sortedByLen.length >= 2) mediumChunk = sortedByLen[1];
    }

    return {
      targetChunkId: chunkId,
      small: smallChunk || target,
      medium: mediumChunk,
      large: largeChunk,
    };
  },
};
