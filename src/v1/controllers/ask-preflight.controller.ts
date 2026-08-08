import type { Context } from "hono";
import type { Env } from "../types/env";
import type { D1Database } from "@cloudflare/workers-types";

import { buildPreflightChain } from "../utils/preflight-chain";
import { parsePreflight } from "../utils/preflight.parse"
import { normalizeLanguage, makeThreadId } from "../utils/ask-helper";

import { messagesdb } from "../services/db/messages.db";
import { threaddb } from "../services/db/thread.db";

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const askPreflightController = {
  preflight: async (c: Context<Env>) => {
    let payload: any = {};
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }

    console.log("payload", payload);

    const userId = String(payload?.userId || "").trim();
    const message = String(payload?.message || "").trim();
    const language = normalizeLanguage(payload?.language);
    const clientThreadId = payload?.threadId ? String(payload.threadId) : null;

    if (!userId || !message) {
      return c.json({ ok: false, error: "userId and message required" }, 400);
    }

    const db = c.env.DB as unknown as D1Database;
    const apiKey = c.env.OPENAI_API_KEY;

    // ✅ Stable thread selection:
    // 1) clientThreadId if provided
    // 2) existing thread for user
    // 3) create new
    let threadId =
      clientThreadId || (await threaddb.getThreadIdForUser(db, userId));

    if (!threadId) threadId = makeThreadId(userId, null);

    console.log("preflight threadId", threadId);

    // Load history from finalized messages only; preflight does not persist placeholders.
    const historyRows = await messagesdb.getLatestMessagesForThread(db, threadId, 5);
    console.log("preflight history rows", historyRows.length);

    const historyText = historyRows
      .slice()
      .reverse() // oldest -> newest
      .map((m) => `User: ${m.question || ""}\nAssistant: ${m.answer || ""}`)
      .join("\n\n")
      .slice(0, 2000);

    console.log("preflight history chars", historyText.length);

    const chain = buildPreflightChain(apiKey);

    // ✅ IMPORTANT: match prompt placeholders exactly: message, language, history
    const raw = await chain.invoke({
      message,
      language,
      history: historyText,
    });

    // Prefer your strong parser (contract enforcement) instead of raw JSON.parse only
    const parsed = parsePreflight(raw);

    // Safety: if model returned non-JSON or weird output, parsePreflight already fails soft.
    // Still, guard against totally empty object shape:
    if (!parsed?.route) {
      return c.json(
        { ok: false, error: "Invalid preflight response", raw },
        500
      );
    }

    return c.json({
      ok: true,
      threadId,
      ...parsed,
      // optional debug echo
      // raw,
    });
  },
};
