import type { D1Database } from "@cloudflare/workers-types";

type Totals = {
  total_sessions: number;
  total_messages: number;
  avg_sessions_per_day: number;
  busiest_day: { date: string | null; sessions: number };
};

type DailyRow = { date: string; sessions: number; messages: number };

type ThreadRow = {
  thread_id: string;
  user_id: string | null;
  started_at: string | null;
  message_count: number;
};

type MsgRow = {
  id: number;
  thread_id: string;
  user_id: string;
  question: string;
  answer: string;
  context: string;
  token_usage: number;
  is_answered: number;
  created_at: string;
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const startOfDayISO = (d: Date) => `${toISODate(d)} 00:00:00`;
const nextDayStartISO = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return startOfDayISO(x);
};

const daysInclusive = (from: Date, to: Date) => {
  const a = new Date(toISODate(from)).getTime();
  const b = new Date(toISODate(to)).getTime();
  const diff = Math.floor((b - a) / (24 * 60 * 60 * 1000));
  return diff + 1;
};

export const chatAnalyticsDb = {
  async getTotals(db: D1Database, from: Date, to: Date): Promise<Totals> {
    const fromTs = startOfDayISO(from);
    const toTsExclusive = nextDayStartISO(to);

    const sessionsRes = await db
      .prepare(
        `
        SELECT COUNT(*) AS n
        FROM threads
        WHERE created_at >= ? AND created_at < ?
      `
      )
      .bind(fromTs, toTsExclusive)
      .first();

    const messagesRes = await db
      .prepare(
        `
        SELECT COUNT(*) AS n
        FROM messages
        WHERE created_at >= ? AND created_at < ?
      `
      )
      .bind(fromTs, toTsExclusive)
      .first();

    const busiestRes = await db
      .prepare(
        `
        SELECT date(created_at) AS d, COUNT(*) AS n
        FROM threads
        WHERE created_at >= ? AND created_at < ?
        GROUP BY date(created_at)
        ORDER BY n DESC, d DESC
        LIMIT 1
      `
      )
      .bind(fromTs, toTsExclusive)
      .first();

    const total_sessions = Number((sessionsRes as any)?.n || 0);
    const total_messages = Number((messagesRes as any)?.n || 0);

    const days = Math.max(1, daysInclusive(from, to));
    const avg_sessions_per_day = Math.round((total_sessions / days) * 100) / 100;

    const busiest_day = {
      date: (busiestRes as any)?.d ? String((busiestRes as any).d) : null,
      sessions: Number((busiestRes as any)?.n || 0),
    };

    return { total_sessions, total_messages, avg_sessions_per_day, busiest_day };
  },

  async getDailyBreakdown(db: D1Database, from: Date, to: Date): Promise<DailyRow[]> {
    const fromTs = startOfDayISO(from);
    const toTsExclusive = nextDayStartISO(to);

    const sessionsByDay = await db
      .prepare(
        `
        SELECT date(created_at) AS d, COUNT(*) AS sessions
        FROM threads
        WHERE created_at >= ? AND created_at < ?
        GROUP BY date(created_at)
      `
      )
      .bind(fromTs, toTsExclusive)
      .all();

    const messagesByDay = await db
      .prepare(
        `
        SELECT date(created_at) AS d, COUNT(*) AS messages
        FROM messages
        WHERE created_at >= ? AND created_at < ?
        GROUP BY date(created_at)
      `
      )
      .bind(fromTs, toTsExclusive)
      .all();

    const sessionsMap = new Map<string, number>();
    for (const r of sessionsByDay.results || []) {
      sessionsMap.set(String((r as any).d), Number((r as any).sessions || 0));
    }

    const messagesMap = new Map<string, number>();
    for (const r of messagesByDay.results || []) {
      messagesMap.set(String((r as any).d), Number((r as any).messages || 0));
    }

    const rows: DailyRow[] = [];
    const cursor = new Date(toISODate(from));
    const end = new Date(toISODate(to));

    while (cursor.getTime() <= end.getTime()) {
      const d = toISODate(cursor);
      rows.push({
        date: d,
        sessions: sessionsMap.get(d) || 0,
        messages: messagesMap.get(d) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    return rows;
  },

  async getThreadsByDate(db: D1Database, dateISO: string): Promise<ThreadRow[]> {
    const dayStart = `${dateISO} 00:00:00`;
    const nextDay = new Date(dateISO);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEndExclusive = `${toISODate(nextDay)} 00:00:00`;

    const res = await db
      .prepare(
        `
        SELECT
          t.thread_id AS thread_id,
          t.user_id AS user_id,
          t.created_at AS started_at,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.thread_id = t.thread_id
          ) AS message_count
        FROM threads t
        WHERE t.created_at >= ? AND t.created_at < ?
        ORDER BY t.created_at DESC
      `
      )
      .bind(dayStart, dayEndExclusive)
      .all();

    return (res.results || []).map((r: any) => ({
      thread_id: String(r.thread_id),
      user_id: r.user_id ? String(r.user_id) : null,
      started_at: r.started_at ? String(r.started_at) : null,
      message_count: Number(r.message_count || 0),
    }));
  },

  async getMessagesForThread(db: D1Database, threadId: string): Promise<MsgRow[]> {
    const res = await db
      .prepare(
        `
        SELECT
          id,
          thread_id,
          user_id,
          question,
          answer,
          context,
          token_usage,
          is_answered,
          created_at
        FROM messages
        WHERE thread_id = ?
        ORDER BY created_at ASC
      `
      )
      .bind(threadId)
      .all();

    return (res.results || []).map((r: any) => ({
      id: Number(r.id),
      thread_id: String(r.thread_id),
      user_id: String(r.user_id),
      question: String(r.question || ""),
      answer: String(r.answer || ""),
      context: String(r.context || ""),
      token_usage: Number(r.token_usage || 0),
      is_answered: Number(r.is_answered || 0),
      created_at: String(r.created_at),
    }));
  },
};
