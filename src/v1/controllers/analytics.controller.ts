import type { Context } from "hono";
import { chatAnalyticsDb } from "../services/db/chat-analytics.db";

type Granularity = "daily" | "weekly" | "monthly";

const parseISODate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDateOnlyISO = (d: Date) => d.toISOString().slice(0, 10);

const clampGranularity = (v?: string | null): Granularity => {
  const x = String(v || "daily").toLowerCase();
  if (x === "weekly" || x === "monthly" || x === "daily") return x;
  return "daily";
};

const parseRange = (c: Context) => {
  const now = new Date();
  const to = parseISODate(c.req.query("to")) || now;

  const fromRaw = parseISODate(c.req.query("from"));
  const fromDefault = new Date(to);
  fromDefault.setDate(fromDefault.getDate() - 30);
  const from = fromRaw || fromDefault;

  const fromDay = new Date(toDateOnlyISO(from));
  const toDay = new Date(toDateOnlyISO(to));

  if (fromDay.getTime() > toDay.getTime()) return { from: toDay, to: fromDay };
  return { from: fromDay, to: toDay };
};

export const ChatAnalyticsController = {
  stats: async (c: Context) => {
    try {
      const { from, to } = parseRange(c);
      const granularity = clampGranularity(c.req.query("granularity"));

      const totals = await chatAnalyticsDb.getTotals(c.env.DB, from, to);

      return c.json({
        ok: true,
        range: { from: toDateOnlyISO(from), to: toDateOnlyISO(to) },
        granularity,
        totals,
      });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch stats", error: err.message }, 500);
    }
  },

  dailyBreakdown: async (c: Context) => {
    try {
      const { from, to } = parseRange(c);
      const q = (c.req.query("q") || "").trim().toLowerCase();

      let rows = await chatAnalyticsDb.getDailyBreakdown(c.env.DB, from, to);

      if (q) {
        rows = rows.filter((r) => r.date.includes(q));
      }

      return c.json({
        ok: true,
        range: { from: toDateOnlyISO(from), to: toDateOnlyISO(to) },
        rows,
      });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch daily breakdown", error: err.message }, 500);
    }
  },

  threadsByDate: async (c: Context) => {
    try {
      const dateStr = c.req.query("date");
      if (!dateStr) return c.json({ ok: false, message: "date is required (YYYY-MM-DD)" }, 400);

      const date = parseISODate(dateStr);
      if (!date) return c.json({ ok: false, message: "Invalid date" }, 400);

      const dateISO = toDateOnlyISO(date);
      const threads = await chatAnalyticsDb.getThreadsByDate(c.env.DB, dateISO);

      return c.json({ ok: true, date: dateISO, threads });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch threads", error: err.message }, 500);
    }
  },

  threadMessages: async (c: Context) => {
    try {
      const threadId = c.req.param("threadId");
      if (!threadId) return c.json({ ok: false, message: "threadId is required" }, 400);

      const messages = await chatAnalyticsDb.getMessagesForThread(c.env.DB, threadId);

      return c.json({ ok: true, threadId, messages });
    } catch (err: any) {
      return c.json({ ok: false, message: "Failed to fetch thread messages", error: err.message }, 500);
    }
  },
};
