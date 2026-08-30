import type { D1Database } from '@cloudflare/workers-types';

export const threaddb = {

  async getThreadIdForUser(db: D1Database, userId: string, clientId: string = "default"): Promise<string | null> {
    try {
      const targetClient = clientId || "default";
      const result = await db
        .prepare('SELECT thread_id FROM threads WHERE user_id = ? AND (client_id = ? OR (client_id IS NULL AND ? = "default")) ORDER BY created_at DESC LIMIT 1')
        .bind(userId, targetClient, targetClient)
        .first();

      const threadId = result && typeof result.thread_id === 'string' ? result.thread_id : null;
      return threadId;
    } catch (err) {
      console.error("  Failed to get thread ID for user:", err);
      return null;
    }
  },

async saveThreadToDatabase(db: D1Database, userId: string, threadId: string, clientId: string = "default"): Promise<void> {
  try {
    const existing = await db
      .prepare(`SELECT 1 FROM threads WHERE thread_id = ?`)
      .bind(threadId)
      .first();

    if (!existing) {
      await db
        .prepare(`
          INSERT INTO threads (user_id, thread_id, client_id, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `)
        .bind(userId, threadId, clientId || "default")
        .run();
    } else {
      console.info(`ℹ️ Thread already exists: ${threadId}, skipping insert.`);
    }
  } catch (err) {
    console.error("  Failed to save thread to database:", err);
    throw err;
  }
},

  async getAllThreads(db: D1Database, clientId?: string): Promise<any[]> {
    try {
      const targetClient = clientId || "default";
      const result = await db.prepare('SELECT * FROM threads WHERE (client_id = ? OR (client_id IS NULL AND ? = "default")) ORDER BY created_at DESC').bind(targetClient, targetClient).all();
      return result.results || [];
    } catch (err) {
      console.error("  Failed to fetch all threads:", err);
      return [];
    }
  },

  async getMessagesForThread(db: D1Database, threadId: string): Promise<any[]> {
    try {
      const result = await db
        .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC')
        .bind(threadId)
        .all();
      return result.results || [];
    } catch (err) {
      console.error("  Failed to fetch messages for thread:", err);
      return [];
    }
  },

  async getThreadSummary(db: D1Database, threadId: string): Promise<string | null> {
    try {
      const row = await db.prepare('SELECT summary FROM threads WHERE thread_id = ?').bind(threadId).first();
      return row && typeof row.summary === 'string' ? row.summary : null;
    } catch {
      return null;
    }
  },

  async updateThreadSummary(db: D1Database, threadId: string, summary: string): Promise<void> {
    try {
      await db.prepare('UPDATE threads SET summary = ? WHERE thread_id = ?').bind(summary, threadId).run();
    } catch (err: any) {
      console.warn("Failed to update thread summary:", err.message);
    }
  }
};

