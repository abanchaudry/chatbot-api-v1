// src/services/db/messages.db.ts
import type { D1Database } from "@cloudflare/workers-types";

export const messagesdb = {
  /**
   * Saves a message row and returns its messageId (stable key for traces).
   */
  async saveMessageToDatabase(
    db: D1Database,
    threadId: string,
    userId: string,
    question: string,
    answer: string,
    context: string,
    tokenUsage: number,
    isAnswered = 1,
    clientId: string = "default"
  ): Promise<string> {
    const res = await db
      .prepare(
        `
        INSERT INTO messages (
          thread_id,
          user_id,
          client_id,
          question,
          answer,
          context,
          token_usage,
          is_answered,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime())
      `
      )
      .bind(threadId, userId, clientId || "default", question, answer, context, tokenUsage, isAnswered)
      .run();

    const lastRowId = (res as any)?.meta?.last_row_id;

    if (lastRowId != null) return String(lastRowId);

    // fallback (very rare)
    return `${threadId}:${Date.now()}`;
  },

  async getLatestMessagesForThread(
    db: D1Database,
    threadId: string,
    limit = 5
  ): Promise<
    Array<{
      messageId: string;
      question: string;
      answer: string;
      context: string;
      created_at: string;
    }>
  > {
    const result = await db
      .prepare(
        `
        SELECT
          CAST(rowid AS TEXT) as messageId,
          question,
          answer,
          context,
          created_at
        FROM messages
        WHERE thread_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
      )
      .bind(threadId, limit)
      .all();

    return (result.results || []) as any[];
  },
};
