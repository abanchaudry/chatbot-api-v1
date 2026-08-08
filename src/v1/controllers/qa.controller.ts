// src/v5/controllers/qa.controller.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

import { questionGenPrompt } from "../prompts/question-generate.prompt";
import { htmlToText } from "../utils/html-to-text";
import { fetchSitemapUrls } from "../utils/site-map";
import { logger } from "../utils/logger";

import { runAsk } from "./ask.run";

type Tone = "professional" | "friendly" | "human" | "business" | "auto";
function safeBool(v: any) { return v === true; }

function clamp(n: number, min: number, max: number) {
  n = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, n));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length) as any;
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

// Add near the top (helpers)
type AskOnlyQuestion =
  | string
  | {
      question: string;
      expectedRoute?: string;
      tags?: string[];
      meta?: Record<string, any>;
    };

function safeStr(v: any, max = 5000) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isNonEmptyStringArray(v: any): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim().length > 0);
}

function normalizeQuestions(input: any): AskOnlyQuestion[] {
  if (!Array.isArray(input)) return [];
  const out: AskOnlyQuestion[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      const q = item.trim();
      if (q) out.push(q);
      continue;
    }
    if (item && typeof item === "object") {
      const q = String((item as any).question ?? "").trim();
      if (q) out.push({
        question: q,
        expectedRoute: (item as any).expectedRoute ? String((item as any).expectedRoute) : undefined,
        tags: Array.isArray((item as any).tags) ? (item as any).tags.map(String) : undefined,
        meta: (item as any).meta && typeof (item as any).meta === "object" ? (item as any).meta : undefined,
      });
    }
  }
  return out;
}


export const QAController = {
  run: async (c: Context<Env>) => {
    const t0 = Date.now();

    let payload: any = {};
    try { payload = await c.req.json(); }
    catch { return c.json({ ok: false, error: "Invalid JSON" }, 400); }

    const userId = String(payload?.userId || "").trim();
    const threadId = payload?.threadId ? String(payload.threadId) : `qa_${Date.now()}`;
    const language = String(payload?.language || "english").toLowerCase() === "spanish" ? "spanish" : "english";

    const tone: Tone = (String(payload?.tone || "auto").toLowerCase() as Tone) || "auto";
    const questionCount = clamp(payload?.questionCount ?? 30, 5, 200);
    const questionsPerPage = clamp(payload?.questionsPerPage ?? 2, 1, 10);
    const maxPages = clamp(payload?.maxPages ?? 25, 1, 200);

    const runMode = String(payload?.runMode || "ask_all"); // generate_only | ask_all | ask_only
    const debug = safeBool(payload?.debug);

    if (!userId) return c.json({ ok: false, error: "userId required" }, 400);

    // 1) Resolve pages
    const source = payload?.source || {};
    const mode = String(source?.mode || "single_url");
    const srcUrl = String(source?.url || "").trim();
    const urls: string[] = Array.isArray(source?.urls) ? source.urls.map(String) : [];
    const instructions = String(source?.instructions || "").trim();

    let pageUrls: string[] = [];
    if (runMode === "ask_only") {
      pageUrls = [];
    } else if (mode === "sitemap") {
      if (!srcUrl) return c.json({ ok: false, error: "source.url (sitemap) required" }, 400);
      pageUrls = await fetchSitemapUrls(srcUrl, fetch, maxPages);
    } else if (mode === "urls") {
      pageUrls = urls.slice(0, maxPages);
    } else if (mode === "single_url") {
      if (!srcUrl) return c.json({ ok: false, error: "source.url required" }, 400);
      pageUrls = [srcUrl];
    } else if (mode === "instructions") {
      pageUrls = [];
    } else {
      return c.json({ ok: false, error: `Unknown source.mode: ${mode}` }, 400);
    }

    // 2) Fetch page text
    const pages = await mapLimit(
      pageUrls,
      4,
      async (url) => {
        try {
          const r = await fetch(url, { cf: { cacheTtl: 60 } });
          const html = await r.text();
          const text = htmlToText(html).slice(0, 12000);
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const title = titleMatch ? htmlToText(titleMatch[1]) : "";
          return { url, title, ok: r.ok, status: r.status, text };
        } catch (e) {
          return { url, title: "", ok: false, status: 0, text: "", error: String(e) };
        }
      }
    );

    const pagesForPrompt =
      mode === "instructions"
        ? [{ url: "instructions://input", title: "Instructions", ok: true, status: 200, text: instructions.slice(0, 12000) }]
        : pages.filter((p) => p.ok && p.text.length > 50);

    // 3) Generate questions (unless ask_only)
    let questions: any[] = [];
    if (runMode === "ask_only") {
      questions = Array.isArray(payload?.questions) ? payload.questions : [];
      if (!questions.length) return c.json({ ok: false, error: "questions[] required for ask_only" }, 400);
    } else {
      const llm = new ChatOpenAI({ apiKey: c.env.OPENAI_API_KEY, model: "gpt-4o-mini", temperature: 0.3 });

      const maxPromptPages = Math.min(pagesForPrompt.length, maxPages);
      const selectedPages = pagesForPrompt.slice(0, maxPromptPages).map((p) => ({
        pageUrl: p.url,
        pageTitle: p.title,
        text: p.text,
      }));

      const chain = RunnableSequence.from([questionGenPrompt, llm, new StringOutputParser()]);
      const pagesJson = JSON.stringify({ targetTotal: questionCount, questionsPerPage, pages: selectedPages });

      const raw = await chain.invoke({ tone, language, pagesJson });

      try {
        const parsed = JSON.parse(raw);
        questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
      } catch {
        logger.error("v5.test.question_gen_parse_failed", { rawPreview: raw.slice(0, 500) });
        return c.json({ ok: false, error: "Question generation returned invalid JSON", rawPreview: raw.slice(0, 500) }, 500);
      }

      questions = questions.slice(0, questionCount);
    }

    if (runMode === "generate_only") {
      return c.json({
        ok: true,
        threadId,
        mode: "generate_only",
        questionCount: questions.length,
        questions,
        ms: Date.now() - t0,
      });
    }

    // 4) Ask pipeline
    const results = await mapLimit(
      questions,
      2,
      async (qObj, idx) => {
        const qText = String(qObj?.question || qObj || "").trim();
        if (!qText) return { idx, ok: false, error: "Empty question" };

        const askPayload = {
          userId,
          threadId,
          message: qText,
          language,
          assistantName: payload?.assistantName,
          domainHint: payload?.domainHint,
          fallbackMessage: payload?.fallbackMessage,
          debug,
          onlySearch: false,
        };

        const askRes = await runAsk(c, askPayload);
        const r = askRes.body;

        const fbMsg = String(payload?.fallbackMessage || "").trim();
        const isFallback = !!(r?.answer && fbMsg && String(r.answer).trim() === fbMsg);

        return {
          idx,
          question: qText,
          pageUrl: qObj?.pageUrl || "",
          intent: qObj?.intent || "",
          answer: r?.answer || "",
          usedBySource: r?.usedBySource || null,
          usedChunks: r?.usedChunks ?? null,
          route: r?.route || "",
          ms: r?.ms ?? null,
          fallback: isFallback,
        };
      }
    );

    const fallbackCount = results.filter((r) => r.fallback).length;
    const okCount = results.filter((r) => r.answer && !r.fallback).length;

    return c.json({
      ok: true,
      threadId,
      mode: "ask_all",
      stats: { total: results.length, ok: okCount, fallback: fallbackCount },
      questions,
      results,
      ms: Date.now() - t0,
    });
  },

   askOnlyBatch: async (c: Context<Env>) => {
    const t0 = Date.now();

    let payload: any = {};
    try { payload = await c.req.json(); }
    catch { return c.json({ ok: false, error: "Invalid JSON" }, 400); }

    const userId = safeStr(payload?.userId, 200);
    if (!userId) return c.json({ ok: false, error: "userId required" }, 400);

    // IMPORTANT: one thread for whole batch
    const threadId = payload?.threadId
      ? safeStr(payload.threadId, 300)
      : `qa_${userId}_${Date.now()}`;

    const language = String(payload?.language || "english").toLowerCase() === "spanish" ? "spanish" : "english";

    const assistantName = payload?.assistantName;
    const domainHint = payload?.domainHint;
    const debug = payload?.debug === true;
    const onlySearch = payload?.onlySearch === true;

    const fallbackMessage = safeStr(
      payload?.fallbackMessage || c.env.FALLBACK_MESSAGE || "",
      2000
    );

    const stopOnFallback = payload?.stopOnFallback === true;
    const stopOnError = payload?.stopOnError === true;

    const questions = normalizeQuestions(payload?.questions);
    if (!questions.length) {
      return c.json({ ok: false, error: "questions[] required (string[] or {question}[])" }, 400);
    }

    // Run sequentially so follow-ups and thread memory behave deterministically
    const results: any[] = [];
    let fallbackCount = 0;
    let errorCount = 0;

    for (let idx = 0; idx < questions.length; idx++) {
      const qObj = questions[idx];
      const qText = typeof qObj === "string" ? qObj : qObj.question;

      const askPayload = {
        userId,
        threadId,
        message: qText,
        language,
        assistantName,
        domainHint,
        fallbackMessage,
        debug,
        onlySearch,
      };

      try {
        const askRes = await runAsk(c, askPayload);
        const r = askRes?.body || {};

        const ans = safeStr(r?.answer, 12000);
        const route = safeStr(r?.route, 50);

        const isFallback =
          !!fallbackMessage &&
          !!ans &&
          ans.trim() === fallbackMessage.trim();

        if (isFallback) fallbackCount++;

        const expectedRoute = typeof qObj === "string" ? undefined : qObj.expectedRoute;
        const routeMatch = expectedRoute ? (route === expectedRoute) : null;

        results.push({
          idx,
          question: qText,
          route,
          expectedRoute: expectedRoute || null,
          routeMatch,
          answer: ans,
          fallback: isFallback,
          usedBySource: r?.usedBySource || null,
          usedChunks: r?.usedChunks ?? null,
          tokensUsed: r?.tokensUsed ?? null,
          ms: r?.ms ?? null,
          messageId: r?.messageId ?? null,
          // pass-through metadata if provided
          tags: typeof qObj === "string" ? null : (qObj.tags || null),
          meta: typeof qObj === "string" ? null : (qObj.meta || null),
        });

        if (stopOnFallback && isFallback) break;
      } catch (e: any) {
        errorCount++;
        results.push({
          idx,
          question: qText,
          ok: false,
          error: String(e?.message || e),
        });
        if (stopOnError) break;
      }
    }

    const okCount = results.filter((r) => r.answer && r.fallback === false).length;

    return c.json({
      ok: true,
      mode: "ask_only_batch",
      threadId,
      stats: {
        total: questions.length,
        completed: results.length,
        ok: okCount,
        fallback: fallbackCount,
        errors: errorCount,
      },
      results,
      ms: Date.now() - t0,
    });
  }
};
