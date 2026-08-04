import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";

export const messageTracesDb = {
  async save(
    db: D1Database,
    args: { threadId: string; userId: string; messageId: string; message: string; traceJson: string }
  ) {
    const id = nanoid();

    await db
      .prepare(
        `INSERT INTO message_traces (id, message_id, thread_id, user_id, message, trace_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime())`
      )
      .bind(id, args.messageId, args.threadId, args.userId, args.message, args.traceJson)
      .run();

    return id;
  },

  // ✅ sidebar: latest trace for a specific message
  async getLatestByMessageId(db: D1Database, messageId: string) {
    const res = await db
      .prepare(
        `
        SELECT id, message_id, thread_id, user_id, message, trace_json, created_at
        FROM message_traces
        WHERE message_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .bind(messageId)
      .first();

    return res || null;
  },

  // ✅ useful: all traces for a message (if you ever store multiple)
  async getAllByMessageId(db: D1Database, messageId: string, limit = 20) {
    const res = await db
      .prepare(
        `
        SELECT id, message_id, thread_id, user_id, message, trace_json, created_at
        FROM message_traces
        WHERE message_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
      )
      .bind(messageId, limit)
      .all();

    return (res.results || []) as any[];
  },
};
