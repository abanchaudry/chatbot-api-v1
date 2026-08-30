import type { D1Database } from "@cloudflare/workers-types";


async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeStableChunkId(fileId: string, chunkIndex: number, section?: string) {
  const input = `${fileId}:${chunkIndex}:${section || ""}`;
  return sha256Hex(input);
}

const SECTION_RE =
  /\b(?:NAC|NRS|SECTION)?\s*\d{1,4}\.\d{1,5}(?:\([^)]+\))?(?:\s*[–-]\s*\d{1,4}\.\d{1,5})?\b/i;

const extractSection = (text?: string | null) =>
  (text?.match(SECTION_RE)?.[0] || null)?.toUpperCase().replace(/\s+/g, " ") ?? null;

const ALLOWED_TABLES = new Set(["files", "chunks", "threads", "messages", "ingest_jobs", "ingest_logs", "auth"]);

async function safeCount(db: D1Database, table: string, clientId?: string): Promise<number> {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  try {
    const targetClient = clientId || "default";
    const row = await db.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE (client_id = ? OR (client_id IS NULL AND ? = 'default'))`).bind(targetClient, targetClient).first();
    return (row as any)?.total || 0;
  } catch {
    return 0;
  }
}

async function ensureColumn(db: D1Database, table: string, column: string, ddl: string) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  const has = (columns.results || []).some((c: any) => c.name === column);
  if (!has) {
    await db.prepare(ddl).run();
  }
}

let _filesSchemaEnsured = false;

export const fileDb = {
  async ensureFilesSchema(db: D1Database) {
    if (_filesSchemaEnsured) return;
    try {
      await ensureColumn(db, "files", "dataset", `ALTER TABLE files ADD COLUMN dataset TEXT`);
      await ensureColumn(db, "files", "file_path", `ALTER TABLE files ADD COLUMN file_path TEXT`);
      await ensureColumn(db, "files", "chunk_count", `ALTER TABLE files ADD COLUMN chunk_count INTEGER`);
      await ensureColumn(db, "files", "error_message", `ALTER TABLE files ADD COLUMN error_message TEXT`);
      await ensureColumn(db, "files", "source", `ALTER TABLE files ADD COLUMN source TEXT`);
      await ensureColumn(db, "files", "version", `ALTER TABLE files ADD COLUMN version TEXT`);
      await ensureColumn(db, "files", "checksum", `ALTER TABLE files ADD COLUMN checksum TEXT`);
      await ensureColumn(db, "files", "upload_id", `ALTER TABLE files ADD COLUMN upload_id TEXT`);
      await ensureColumn(db, "files", "chunk_method", `ALTER TABLE files ADD COLUMN chunk_method TEXT`);
      await ensureColumn(db, "files", "embedding_model", `ALTER TABLE files ADD COLUMN embedding_model TEXT`);
      _filesSchemaEnsured = true;
    } catch (e) {
      console.warn("Schema initialization check warning:", e);
    }
  },

  async saveFile(db: D1Database, name: string, size: number, status: string, uuid: string, path: string, dataset: string = "admin", clientId: string = "default") {
    await this.ensureFilesSchema(db);
    await db.prepare(
      `INSERT INTO files (file_name, file_size, file_status, file_id, file_path, dataset, source, client_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(), datetime())`
    ).bind(name, size, status, uuid, path, dataset, dataset, clientId || "default").run();
    return uuid;
  },

  async getAllFilesWithChunkCount(db: D1Database, clientId?: string) {
    await this.ensureFilesSchema(db);
    const targetClient = clientId || "default";
    const result = await db.prepare(
      `SELECT 
         f.file_id,
         f.file_name,
         f.file_size,
         f.file_status,
         f.created_at,
         f.file_path,
         COALESCE(f.dataset, f.source, 'admin') AS dataset,
         COUNT(c.chunk_id) AS chunk_count
       FROM files f
       LEFT JOIN chunks c ON c.file_id = f.file_id
       WHERE (f.client_id = ? OR (f.client_id IS NULL AND ? = 'default'))
       GROUP BY f.file_id, f.file_name, f.file_size, f.file_status, f.created_at, f.file_path, f.dataset
       ORDER BY f.created_at DESC`
    ).bind(targetClient, targetClient).all();
    return result.results || [];
  },

  async getFileById(db: D1Database, fileId: string) {
    await this.ensureFilesSchema(db);
    return await db.prepare(`SELECT * FROM files WHERE file_id = ? LIMIT 1`).bind(fileId).first();
  },

  async findByChecksum(db: D1Database, checksum: string, clientId?: string) {
    await this.ensureFilesSchema(db);
    const targetClient = clientId || "default";
    return await db
      .prepare(`SELECT * FROM files WHERE checksum = ? AND (client_id = ? OR (client_id IS NULL AND ? = 'default')) ORDER BY created_at DESC LIMIT 1`)
      .bind(checksum, targetClient, targetClient)
      .first();
  },

  async insertFile(
    db: D1Database,
    f: {
      id: string;
      name: string;
      source: "admin" | "cron" | "wp";
      dataset?: "admin" | "pdf" | "web";
      version: string;
      size_bytes: number;
      checksum: string;
      file_path?: string | null;
      upload_id?: string | null;
      chunk_method?: string | null;
      embedding_model?: string | null;
      clientId?: string;
    }
  ) {
    await this.ensureFilesSchema(db);

    const targetClient = f.clientId || "default";
    const existing = await db
      .prepare(`SELECT * FROM files WHERE file_name = ? AND checksum = ? AND (client_id = ? OR (client_id IS NULL AND ? = 'default')) ORDER BY created_at DESC LIMIT 1`)
      .bind(f.name, f.checksum, targetClient, targetClient)
      .first();

    if (existing) return existing;

    const dataset = f.dataset || (f.source === "admin" ? "admin" : "web");
    const tenant = f.clientId || "default";

    await db.prepare(
      `INSERT INTO files (
         file_id, file_name, file_size, file_status, created_at, updated_at,
         dataset, source, version, checksum, file_path, upload_id, chunk_method, embedding_model, chunk_count, client_id
       ) VALUES (?, ?, ?, 'received', datetime(), datetime(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      f.id,
      f.name,
      f.size_bytes,
      dataset,
      f.source,
      f.version,
      f.checksum,
      f.file_path || null,
      f.upload_id || null,
      f.chunk_method || null,
      f.embedding_model || null,
      0,
      tenant
    ).run();

    return f;
  },


  async updateFile(db: D1Database, fileId: string, patch: Record<string, any>) {
    await this.ensureFilesSchema(db);

    const ALLOWED_FILE_COLUMNS = new Set([
      "file_name",
      "file_size",
      "file_status",
      "file_path",
      "dataset",
      "chunk_count",
      "error_message",
      "source",
      "version",
      "checksum",
      "upload_id",
      "chunk_method",
      "embedding_model",
    ]);

    const validEntries = Object.entries(patch).filter(([k]) => ALLOWED_FILE_COLUMNS.has(k));
    if (!validEntries.length) return;

    const sets = validEntries.map(([k]) => `${k} = ?`).join(", ");
    const vals = validEntries.map(([, v]) => v);

    await db
      .prepare(`UPDATE files SET ${sets}, updated_at = datetime() WHERE file_id = ?`)
      .bind(...vals, fileId)
      .run();
  },

  async saveChunk(
    db: D1Database,
    args: {
      fileId: string;
      source: "admin" | "cron" | "wp";
      chunkId: string;
      content: string;
      version: string;
      tags: string[];
      topic: string;
      firstSentence: string;
      sectionTitle: string;
      dataset?: "admin" | "pdf" | "web" | string;
      chunkIndex: number;
      sectionNumber: string | null;
      embedding_model?: string | null;
      chunk_method?: string | null;
      content_hash?: string | null;
    }
  ) {
    const sectionNumber = args.sectionNumber || extractSection(args.sectionTitle) || extractSection(args.content);
    const content_hash = args.content_hash || (await sha256Hex(args.content));
    const dataset = args.dataset || (args.source === "admin" ? "admin" : "web");

    await db.prepare(
      `INSERT INTO chunks (
         chunk_id, file_id, dataset, source, content, version, created_at,
         tags, topic, first_sentence, section, chunk_index,
         section_number, section_keywords, priority_level,
         content_hash, embedding_model, chunk_method
       ) VALUES (?, ?, ?, ?, ?, ?, datetime(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      args.chunkId,
      args.fileId,
      dataset,
      args.source,
      args.content,
      args.version,
      JSON.stringify(args.tags || []),
      args.topic || "general",
      args.firstSentence || (args.content.split(/[.!?]/)[0] || "").slice(0, 200),
      args.sectionTitle || "",
      args.chunkIndex,
      sectionNumber,
      JSON.stringify([]),
      "high",
      content_hash,
      args.embedding_model || null,
      args.chunk_method || null
    ).run();
  },

  async getChunksByFileId(db: D1Database, fileId: string, page = 1, perPage = 50) {
    const offset = (page - 1) * perPage;

    const dataQuery = await db.prepare(
      `SELECT chunk_id, section, section_number, topic, first_sentence, content, tags, chunk_index
       FROM chunks
       WHERE file_id = ?
       ORDER BY chunk_index ASC
       LIMIT ? OFFSET ?`
    ).bind(fileId, perPage, offset).all();

    const totalQuery = await db.prepare(`SELECT COUNT(*) AS total FROM chunks WHERE file_id = ?`).bind(fileId).first();

    return { results: dataQuery.results || [], total: (totalQuery as any)?.total || 0 };
  },

  async getAllChunks(db: D1Database, limit = 1000, offset = 0) {
    const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM chunks`).first();
    const total = (totalRow as any)?.total || 0;

    const result = await db.prepare(
      `SELECT chunk_id, section, section_number, topic, first_sentence, content, tags, chunk_index
       FROM chunks
       ORDER BY created_at, chunk_index
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    return { chunks: result.results || [], total };
  },

  async getChunkIdsByFileId(db: D1Database, fileId: string, limit = 200, offset = 0) {
    const res = await db.prepare(
      `SELECT chunk_id
       FROM chunks
       WHERE file_id = ?
       ORDER BY chunk_index ASC
       LIMIT ? OFFSET ?`
    ).bind(fileId, limit, offset).all();

    return (res.results || []).map((r: any) => r.chunk_id).filter(Boolean) as string[];
  },

  async deleteChunksByFileId(db: D1Database, fileId: string) {
    try {
      await db.prepare(`DELETE FROM chunks_fts WHERE rowid IN (SELECT chunk_id FROM chunks WHERE file_id = ?)`).bind(fileId).run();
    } catch {}
    await db.prepare(`DELETE FROM chunks WHERE file_id = ?`).bind(fileId).run();
  },

  async deleteFile(db: D1Database, fileId: string) {
    await this.deleteChunksByFileId(db, fileId);
    await db.prepare(`DELETE FROM files WHERE file_id = ?`).bind(fileId).run();
  },

  async getStats(db: D1Database, clientId?: string) {
    const [files, chunks, threads, messages] = await Promise.all([
      safeCount(db, "files", clientId),
      safeCount(db, "chunks", clientId),
      safeCount(db, "threads", clientId),
      safeCount(db, "messages", clientId),
    ]);
    return { totalFiles: files, totalChunks: chunks, totalThreads: threads, totalMessages: messages };
  },


  async saveChunksBatch(
    db: D1Database,
    args: {
      fileId: string;
      fileName: string;
      version: string;
      chunks: Array<{ index: number; content: string; section?: string; tags?: string[]; topic?: string; tier?: string; parentId?: string | null }>;
      embeddingModel: string;
      chunkMethod: string;
      dataset?: "admin" | "pdf" | "web" | string;
      source?: "admin" | "cron" | "wp";
      clientId?: string;
    }
  ) {
    const origin = args.source || "admin";
    const dataset = args.dataset || (origin === "admin" ? "admin" : "web");
    const tenant = args.clientId || "default";

    const statements = await Promise.all(
      args.chunks.map(async (ch) => {
        const contentStr = String(ch?.content || "");
        const chunk_id = await makeStableChunkId(args.fileId, ch.index, ch.section);
        const firstSentence = String(contentStr.split(/[.!?]/)[0] || "").slice(0, 200);
        const sectionNumber = extractSection(ch?.section || "") || extractSection(contentStr) || "";
        const content_hash = await sha256Hex(contentStr);

        return db.prepare(
          `INSERT OR IGNORE INTO chunks (
             chunk_id, file_id, dataset, source, content, version, created_at,
             tags, topic, first_sentence, section, chunk_index,
             section_number, section_keywords, priority_level,
             content_hash, embedding_model, chunk_method,
             tier, parent_id, client_id
           ) VALUES (?, ?, ?, ?, ?, ?, datetime(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          chunk_id,
          args.fileId,
          dataset,
          origin,
          ch.content,
          args.version,
          JSON.stringify(ch.tags || []),
          ch.topic || "general",
          firstSentence,
          ch.section || "",
          ch.index,
          sectionNumber,
          JSON.stringify([]),
          "high",
          content_hash,
          args.embeddingModel,
          args.chunkMethod,
          ch.tier || "standard",
          ch.parentId || null,
          tenant
        );
      })
    );

    // Execute in fast sequential D1 statement batches of 100
    for (let i = 0; i < statements.length; i += 100) {
      const batch = statements.slice(i, i + 100);
      await db.batch(batch);
    }
  },


  /**
   * Get files with null file_path (legacy files from before fix)
   * These files need re-uploading to ensure file_path is populated
   */
  async getFilesWithNullPath(db: D1Database) {
    await this.ensureFilesSchema(db);
    const result = await db.prepare(
      `SELECT 
         file_id,
         file_name,
         file_size,
         file_status,
         created_at,
         file_path
       FROM files 
       WHERE file_path IS NULL OR file_path = ''
       ORDER BY created_at DESC`
    ).all();
    return result.results || [];
  },

  /**
   * Update file_status and optional chunk_count for a file
   */
  async updateFileStatus(db: D1Database, fileId: string, status: string, chunkCount?: number) {
    await this.ensureFilesSchema(db);
    if (chunkCount !== undefined) {
      await db
        .prepare(`UPDATE files SET file_status = ?, chunk_count = ?, updated_at = datetime() WHERE file_id = ?`)
        .bind(status, chunkCount, fileId)
        .run();
    } else {
      await db
        .prepare(`UPDATE files SET file_status = ?, updated_at = datetime() WHERE file_id = ?`)
        .bind(status, fileId)
        .run();
    }
  },

  makeStableChunkId,
  contentHash: sha256Hex,
  extractSection,
};
