/**
 * ask.prepare.ts
 *
 * Shared preparation layer for both normal ask and streaming endpoints.
 *
 * This stage handles:
 * - Input validation
 * - Thread creation/lookup
 * - History loading
 * - Preflight routing and classification
 * - Direct route handling (small talk, language mismatch, clarification)
 * - Query rewriting
 * - Embedding creation
 *
 * Returns a structured result that feeds into retrieval stage.
 * Avoids duplication between normal and streaming endpoints.
 */

import type { Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../types/env";
import type { PreflightOut } from "../utils/preflight.parse";
import type { TraceShape } from "../utils/trace";
import { format } from "date-fns";

import { buildPreflightChain } from "../utils/preflight-chain";
import { parsePreflight } from "../utils/preflight.parse";

import {
  FALLBACK_MESSAGE_DEFAULT,
  now,
  timeout,
  normalizeLanguage,
  makeThreadId,
  buildChains,
  embedVector,
  getRuntimeLimits,
  buildPolicy,
  getClarifyOptions,
  approxTokens,
} from "../utils/ask-helper";

import { messagesdb } from "../services/db/messages.db";
import { threaddb } from "../services/db/thread.db";
import { getDatasetSignature } from "../services/db/settings.db";

import {
  newTrace,
  traceSetRetrievalHits,
  traceSpan,
  traceStepStart,
  traceStepEnd,
  traceStepFail,
} from "../utils/trace";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

/**
 * Route classifications from preflight chain
 */
export type Route =
  | "SMALL_TALK"
  | "LANGUAGE_MISMATCH"
  | "NEEDS_CLARIFICATION"
  | "ANSWER_WITH_RAG";

/**
 * Result when a direct route (not RAG) is taken.
 */
export type DirectRouteResult = {
  route: Route;
  answer: string;
  tokensUsed: number;
};

/**
 * Main output from preparation stage.
 * If shouldReturn=true, the caller should immediately return the answer.
 * If shouldReturn=false, the caller should proceed to retrieval stage.
 */
export type PrepareResult = {
  ok: boolean;
  error?: string;

  // Always present
  threadId: string;
  userId: string;
  clientId: string;
  route: Route;
  message: string;
  language: "english" | "spanish";
  trace: TraceShape;
  policy: ReturnType<typeof buildPolicy>;
  limits: ReturnType<typeof getRuntimeLimits>;
  chains: ReturnType<typeof buildChains>;
  apiKey: string;

  // For direct routes (SMALL_TALK, LANGUAGE_MISMATCH, NEEDS_CLARIFICATION)
  directRoute?: DirectRouteResult;

  // For RAG flow (when shouldReturn=false)
  query: string;
  embedding: number[] | null;
  historyPreview: string;

  // Configuration
  assistantName: string;
  domainHint: string;
  fallbackMessage: string;
  activeDatasets: Array<"admin" | "pdf" | "web">;
  datasetWeights: Record<string, number>;
  datasetSignature?: string;

  // Timing
  startedAt: number;
};

/* -------------------------------------------------------------------------- */
/*                           SMALL LOCAL HELPERS                              */
/* -------------------------------------------------------------------------- */

function safeBool(v: any) {
  return v === true || String(v).toLowerCase() === "true";
}

function buildHistoryPreview(rows: Array<{ question?: string; answer?: string }>, summary?: string | null) {
  const formattedRows = rows
    .slice()
    .reverse()
    .map((m) => `User: ${m.question || ""}\nAssistant: ${m.answer || ""}`)
    .join("\n\n");

  if (summary && summary.trim().length > 0) {
    return `[SUMMARY OF EARLIER CONVERSATION]: ${summary.trim()}\n\n${formattedRows}`.slice(0, 8000);
  }

  return formattedRows.slice(0, 8000);
}

function logError(label: string, error: any, context?: Record<string, any>) {
  console.error(
    JSON.stringify({
      level: "ERROR",
      label,
      error: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
      ...(context || {}),
    })
  );
}

/* -------------------------------------------------------------------------- */
/*                               STAGES HANDLERS                              */
/* -------------------------------------------------------------------------- */

/**
 * Stage 1: Validate input and create/get thread ID
 */
async function stageValidateAndSetupThread(
  c: Context<Env>,
  payload: any,
  clientId: string = "default"
): Promise<{ ok: boolean; error?: string; userId: string; threadId: string }> {
  const userId = String(payload?.userId || "").trim();
  const clientThreadId = payload?.threadId ? String(payload.threadId) : null;
  const message = String(payload?.message || "").trim();

  if (!userId || !message) {
    return {
      ok: false,
      error: "userId and message required",
      userId: "",
      threadId: "",
    };
  }

  const db = c.env.DB as unknown as D1Database;

  // Get or create thread
  let threadId = clientThreadId || (await threaddb.getThreadIdForUser(db, userId, clientId));
  if (!threadId) {
    threadId = makeThreadId(userId, null);
  }

  return {
    ok: true,
    userId,
    threadId,
  };
}

/**
 * Stage 2: Load conversation history (12 messages + rolling summary)
 */
async function stageLoadHistory(
  c: Context<Env>,
  userId: string,
  threadId: string,
  trace: TraceShape
): Promise<string> {
  const db = c.env.DB as unknown as D1Database;

  const [historyRows, summary] = await Promise.all([
    traceSpan(
      trace,
      "history_load",
      async () => {
        return await messagesdb.getLatestMessagesForThread(db, threadId, 12);
      },
      { take: 12 },
      (rows) => ({ rows: rows.length })
    ).catch((e) => {
      logError("history_load_failed", e, { threadId });
      traceStepFail(trace, "history_load", 0, e);
      return [];
    }),
    threaddb.getThreadSummary(db, threadId).catch(() => null)
  ]);

  const historyPreview = buildHistoryPreview(historyRows || [], summary);
  traceStepEnd(trace, "history_preview", 0, { previewChars: historyPreview.length, hasSummary: !!summary });

  return historyPreview;
}

/**
 * Stage 3: Run preflight classification and get route
 */
async function stageRunPreflight(
  apiKey: string,
  message: string,
  language: "english" | "spanish",
  historyPreview: string,
  assistantName: string,
  domainHint: string,
  trace: TraceShape
): Promise<PreflightOut> {
  const preflightChain = buildPreflightChain(apiKey);

  const currentDate = format(new Date(), "EEEE, MMMM d, yyyy (HH:mm 'UTC')");

  try {
    const pfRaw = await timeout(
      preflightChain.invoke({
        message,
        language,
        history: historyPreview,
        assistantName,
        domainHint,
        company: domainHint,
        brand: assistantName,
        currentDate,
      } as any),
      6500,
      "preflight"
    );

    const pf = parsePreflight(pfRaw);
    traceStepEnd(trace, "preflight_parsed", 0, {
      route: pf.route,
      reason: pf.reason,
      rewritten: !!pf.rewrittenQuestion,
    });

    return pf;
  } catch (e: any) {
    logError("preflight_failed", e);

    const fallbackPf: PreflightOut = {
      route: "ANSWER_WITH_RAG",
      languageOk: true,
      detectedLanguage: "other",
      hasGreeting: false,
      isGreetingOnly: false,
      isFollowUp: false,
      rewrittenQuestion: "",
      subQueries: [],
      reason: "preflight_failed",
    };

    traceStepEnd(trace, "preflight_fallback", 0, { reason: fallbackPf.reason });
    return fallbackPf;
  }
}

/**
 * Stage 4: Handle direct routes (non-RAG)
 * Returns the answer immediately for small talk, language mismatch, clarification
 */
async function stageHandleDirectRoutes(
  route: Route,
  message: string,
  language: "english" | "spanish",
  historyPreview: string,
  assistantName: string,
  domainHint: string,
  clarifyOptions: string[] | null,
  chains: ReturnType<typeof buildChains>,
  trace: TraceShape
): Promise<DirectRouteResult | null> {
  if (route === "SMALL_TALK") {
    const ans = await traceSpan(
      trace,
      "smalltalk_answer",
      async () => {
        const currentDate = format(new Date(), "EEEE, MMMM d, yyyy (HH:mm 'UTC')");
        return await chains.smallTalk.invoke({
          message,
          language,
          history: historyPreview,
          assistantName,
          domainHint,
          currentDate,
        } as any);
      },
      undefined,
      (a) => ({ answerChars: String(a || "").length })
    );

    return {
      route,
      answer: ans,
      tokensUsed: approxTokens(ans.length),
    };
  }

  if (route === "LANGUAGE_MISMATCH") {
    const ans = await traceSpan(
      trace,
      "lang_mismatch_answer",
      async () => {
        return await chains.langMismatch.invoke({
          language,
          assistantName,
        } as any);
      },
      undefined,
      (a) => ({ answerChars: String(a || "").length })
    );

    return {
      route,
      answer: ans,
      tokensUsed: approxTokens(ans.length),
    };
  }

  if (route === "NEEDS_CLARIFICATION") {
    const options = clarifyOptions || [];

    const ans = await traceSpan(
      trace,
      "clarify_answer",
      async () => {
        return await chains.clarify.invoke({
          message,
          language,
          history: historyPreview,
          assistantName,
          domainHint,
          clarifyOptions: options,
        } as any);
      },
      { options: options.length },
      (a) => ({ answerChars: String(a || "").length })
    );

    return {
      route,
      answer: ans,
      tokensUsed: approxTokens(ans.length),
    };
  }

  return null;
}

/**
 * Stage 5: Create embeddings for the query
 * Attempts to reuse speculative embedding for original message if applicable
 */
async function stageEmbedQuery(
  apiKey: string,
  message: string,
  rewrittenQuestion: string,
  trace: TraceShape
): Promise<number[] | null> {
  // Determine which query to embed
  const finalQuery = (rewrittenQuestion?.trim() && rewrittenQuestion) || message;

  // First, try speculative embedding on the original message
  let embedding: number[] | null = null;

  if (finalQuery === message) {
    // Query was not rewritten; embed speculatively
    try {
      const started = Date.now();
      traceStepStart(trace, "embed_speculative", { timeoutMs: 6500 });

      embedding = await timeout(embedVector(apiKey, message), 6500, "embed_speculative");
      traceStepEnd(trace, "embed_speculative", Date.now() - started, { ok: true });
    } catch (e: any) {
      logError("embed_speculative_failed", e);
      traceStepFail(trace, "embed_speculative", 0, e);
    }
  } else {
    // Query was rewritten; embed the rewritten version
    try {
      const started = Date.now();
      traceStepStart(trace, "embed_rewritten", { timeoutMs: 6500 });

      embedding = await timeout(embedVector(apiKey, finalQuery), 6500, "embed_rewritten");
      traceStepEnd(trace, "embed_rewritten", Date.now() - started, { ok: true });
    } catch (e: any) {
      logError("embed_rewritten_failed", e);
      traceStepFail(trace, "embed_rewritten", 0, e);
    }
  }

  return embedding;
}

/* -------------------------------------------------------------------------- */
/*                          PUBLIC ENTRY POINT                                */
/* -------------------------------------------------------------------------- */

/**
 * Main preparation pipeline.
 * Shared by both /ask and /ask/stream endpoints.
 *
 * @returns PrepareResult with all context needed for retrieval/execution stages
 */
export async function preparePipeline(
  c: Context<Env>,
  payload: any
): Promise<PrepareResult> {
  const t0 = now();

  // Extract payload
  const userId = String(payload?.userId || "").trim();
  const message = String(payload?.message || "").trim();
  const language = normalizeLanguage(payload?.language);

  // Dynamic Multi-Tenant Context Resolution
  let companyName = c.env.COMPANY_NAME || "Enterprise Assistant";
  let assistantName = String(payload?.assistantName || "").trim();
  let domainHint = String(payload?.domainHint || "").trim();
  let apiKey = c.env.OPENAI_API_KEY;

  let activeClientId = "default";
  let activeDatasets: Array<"admin" | "pdf" | "web"> = ["admin", "pdf", "web"];
  let datasetWeights: Record<string, number> = {
    admin: 1.25,
    pdf: 1.10,
    web: 1.00,
  };

  let datasetSignature: string = getDatasetSignature();

  try {
    const { tenantService } = await import("../services/tenant.service");
    const tenantCtx = await tenantService.resolveContext(c);
    if (tenantCtx) {
      if (tenantCtx.clientId) activeClientId = tenantCtx.clientId;
      const settings = tenantCtx.settings;
      if (settings) {
        datasetSignature = getDatasetSignature(settings);
        if (settings.company_name) companyName = settings.company_name;
        if (!assistantName) assistantName = settings.assistant_name;
        if (!domainHint) domainHint = settings.domain_hint;

        const dsList: Array<"admin" | "pdf" | "web"> = [];
        if (settings.dataset_admin_enabled !== 0) dsList.push("admin");
        if (settings.dataset_pdf_enabled !== 0) dsList.push("pdf");
        if (settings.dataset_web_enabled !== 0) dsList.push("web");
        activeDatasets = dsList.length > 0 ? dsList : ["admin", "pdf", "web"];

        datasetWeights = {
          admin: Number(settings.dataset_admin_weight) || 1.25,
          pdf: Number(settings.dataset_pdf_weight) || 1.10,
          web: Number(settings.dataset_web_weight) || 1.00,
        };
      }

      if (tenantCtx.openaiApiKey) {
        apiKey = tenantCtx.openaiApiKey;
      }

      if (tenantCtx.isByok && tenantCtx.cfAccountId && tenantCtx.cfApiToken) {
        (c as any).set("cfAccountId", tenantCtx.cfAccountId);
        (c as any).set("cfApiToken", tenantCtx.cfApiToken);
      }
    }
  } catch {}

  // Fallback to env vars if D1 settings not found
  if (!assistantName) assistantName = c.env.ASSISTANT_NAME || "C";
  if (!domainHint) domainHint = c.env.ASSISTANT_DOMAIN_HINT || "Official customer support and knowledge assistant.";

  const fallbackMessage = String(
    payload?.fallbackMessage || c.env.FALLBACK_MESSAGE || FALLBACK_MESSAGE_DEFAULT
  ).trim();

  // Initialize trace
  const trace: TraceShape = newTrace({
    userId,
    threadId: "",
    message,
    language,
    assistantName,
    domainHint,
    flags: { debug: safeBool(payload?.debug), onlySearch: false },
  });

  traceStepStart(trace, "request", {
    language,
    assistantName,
    domainHint,
  });

  try {
    // ==== STAGE 1: Validate + Setup Thread ====
    const validation = await stageValidateAndSetupThread(c, payload, activeClientId);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
        threadId: "",
        userId: "",
        clientId: activeClientId,
        route: "ANSWER_WITH_RAG",
        message: "",
        language: "english",
        trace,
        policy: buildPolicy(c.env),
        limits: getRuntimeLimits(c.env),
        chains: buildChains(apiKey),
        apiKey,
        query: "",
        embedding: null,
        historyPreview: "",
        assistantName,
        domainHint,
        fallbackMessage,
        activeDatasets,
        datasetWeights,
        datasetSignature,
        startedAt: t0,
      };
    }

    const { userId: validUserId, threadId } = validation;
    trace.userId = validUserId;
    trace.threadId = threadId;

    traceStepEnd(trace, "request", now() - t0, { threadId });

    // ==== STAGE 2: Load History ====
    const historyPreview = await stageLoadHistory(c, validUserId, threadId, trace);

    // ==== STAGE 3: Preflight Classification ====
    const pf = await stageRunPreflight(
      apiKey,
      message,
      language,
      historyPreview,
      assistantName,
      domainHint,
      trace
    );

    const route: Route = (pf.route as Route) || "ANSWER_WITH_RAG";
    traceStepEnd(trace, "route_selected", 0, { route });

    // Build chains once
    const chains = buildChains(apiKey, {
      chat: c.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      rerank: c.env.OPENAI_RERANK_MODEL || "gpt-4o-mini",
    });

    // ==== STAGE 4: Handle Direct Routes ====
    const directRouteResult = await stageHandleDirectRoutes(
      route,
      message,
      language,
      historyPreview,
      assistantName,
      domainHint,
      getClarifyOptions(c.env, domainHint)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      chains,
      trace
    );

    if (directRouteResult) {
      // Direct route taken; caller should return immediately
      return {
        ok: true,
        threadId,
        userId: validUserId,
        clientId: activeClientId,
        route,
        message,
        language,
        trace,
        policy: buildPolicy(c.env),
        limits: getRuntimeLimits(c.env),
        chains,
        apiKey,
        directRoute: directRouteResult,
        query: "",
        embedding: null,
        historyPreview,
        assistantName,
        domainHint,
        fallbackMessage,
        activeDatasets,
        datasetWeights,
        datasetSignature,
        startedAt: t0,
      };
    }

    // ==== STAGE 5: Embed Query (for RAG) ====
    // Determine which query to use
    const finalQuery = (pf.rewrittenQuestion?.trim() && pf.rewrittenQuestion) || message;
    traceStepEnd(trace, "rag_query", 0, {
      qUsedRewrite: finalQuery !== message,
      qChars: finalQuery.length,
    });

    const embedding = await stageEmbedQuery(apiKey, message, pf.rewrittenQuestion, trace);

    // ==== SUCCESS: Ready for Retrieval ====
    return {
      ok: true,
      threadId,
      userId: validUserId,
      clientId: activeClientId,
      route,
      message,
      language,
      trace,
      policy: buildPolicy(c.env),
      limits: getRuntimeLimits(c.env),
      chains,
      apiKey,
      query: finalQuery,
      embedding,
      historyPreview,
      assistantName,
      domainHint,
      fallbackMessage,
      activeDatasets,
      datasetWeights,
      datasetSignature,
      startedAt: t0,
    };
  } catch (e: any) {
    logError("prepare_fatal_error", e, { userId, message: message.slice(0, 100) });
    traceStepFail(trace, "fatal", now() - t0, e);

    return {
      ok: false,
      error: "Preparation failed: " + String(e?.message || e),
      threadId: "",
      userId: "",
      clientId: activeClientId,
      route: "ANSWER_WITH_RAG",
      message: "",
      language: "english",
      trace,
      policy: buildPolicy(c.env),
      limits: getRuntimeLimits(c.env),
      chains: buildChains(apiKey),
      apiKey,
      query: "",
      embedding: null,
      historyPreview: "",
      assistantName,
      domainHint,
      fallbackMessage,
      activeDatasets,
      datasetWeights,
      datasetSignature,
      startedAt: t0,
    };
  }
}
