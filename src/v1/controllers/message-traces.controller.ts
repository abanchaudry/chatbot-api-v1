import type { Context } from "hono";
import { messageTracesDb } from "../services/db/message-traces.db";

export const MessageTracesController = {
  // GET /v3/messages/:messageId/trace
  getLatestForMessage: async (c: Context) => {
    try {
      const messageId = c.req.param("messageId");
      if (!messageId) return c.json({ ok: false, message: "messageId is required" }, 400);

      const row = await messageTracesDb.getLatestByMessageId(c.env.DB, messageId);
      if (!row) return c.json({ ok: false, message: "Trace not found", messageId }, 404);

      // Parse trace JSON safely (don’t crash UI)
      let trace: any = null;
      try {
        trace = JSON.parse(String((row as any).trace_json || "{}"));
      } catch {
        trace = { parseError: true, raw: String((row as any).trace_json || "") };
      }

      return c.json({
        ok: true,
        messageId,
        meta: {
          id: (row as any).id,
          threadId: (row as any).thread_id,
          userId: (row as any).user_id,
          createdAt: (row as any).created_at,
          message: (row as any).message,
        },
        trace,
      });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch trace", error: err?.message || String(err) }, 500);
    }
  },

  // GET /v3/messages/:messageId/traces?limit=20
  getAllForMessage: async (c: Context) => {
    try {
      const messageId = c.req.param("messageId");
      if (!messageId) return c.json({ ok: false, message: "messageId is required" }, 400);

      const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || 20)));
      const rows = await messageTracesDb.getAllByMessageId(c.env.DB, messageId, limit);

      const parsed = rows.map((r: any) => {
        let trace: any = null;
        try {
          trace = JSON.parse(String(r.trace_json || "{}"));
        } catch {
          trace = { parseError: true, raw: String(r.trace_json || "") };
        }
        return {
          id: r.id,
          messageId: r.message_id,
          threadId: r.thread_id,
          userId: r.user_id,
          createdAt: r.created_at,
          message: r.message,
          trace,
        };
      });

      return c.json({ ok: true, messageId, rows: parsed });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch traces", error: err?.message || String(err) }, 500);
    }
  },
};
