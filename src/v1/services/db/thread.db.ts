import type { D1Database } from '@cloudflare/workers-types';

export const threaddb = {

  async getThreadIdForUser(db: D1Database, userId: string): Promise<string | null> {
    try {
      const result = await db
        .prepare('SELECT thread_id FROM threads WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
        .bind(userId)
        .first();

      const threadId = result && typeof result.thread_id === 'string' ? result.thread_id : null;
      console.log('thread id is generated in thread db service' , threadId)
      return threadId;
    } catch (err) {
      console.error("  Failed to get thread ID for user:", err);
      return null;
    }
  },

async saveThreadToDatabase(db: D1Database, userId: string, threadId: string): Promise<void> {
  try {
    const existing = await db
      .prepare(`SELECT 1 FROM threads WHERE thread_id = ?`)
      .bind(threadId)
      .first();

    if (!existing) {
      await db
        .prepare(`
          INSERT INTO threads (user_id, thread_id, created_at)
          VALUES (?, ?, datetime('now'))
        `)
        .bind(userId, threadId)
        .run();
    } else {
      console.info(`ℹ️ Thread already exists: ${threadId}, skipping insert.`);
    }
  } catch (err) {
    console.error("  Failed to save thread to database:", err);
    throw err;
  }
},

  async getAllThreads(db: D1Database): Promise<any[]> {
    try {
      const result = await db.prepare('SELECT * FROM threads ORDER BY created_at DESC').all();
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
  }
};
