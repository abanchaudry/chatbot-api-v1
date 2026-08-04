/**
 * ask.controller.ts (Refactored)
 *
 * HTTP request handlers for /ask and /ask/stream endpoints.
 *
 * Both endpoints use the shared preparation → retrieval → execution pipeline:
 * 1. preparePipeline: Input validation, threading, preflight, direct routes
 * 2. retrievePipeline: Vector retrieval with intelligent retry logic
 * 3. executePipeline: Final answer generation + rescue
 * 4. SSE formatting: stream the final executed answer
 *
 * This ensures both endpoints use identical retrieval and preparation logic.
 */

import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import type { Env } from "../types/env";

import { preparePipeline } from "../pipeline/ask.prepare";
import { retrievePipeline } from "../pipeline/ask.retrieve";
import { executePipeline } from "../pipeline/ask.execute";

import { createSSEResponse, formatSSEDoneEvent, formatSSEErrorEvent, formatSSEMetaEvent, formatSSETokenEvent } from "../utils/sse-stream";
import { now, persist } from "../utils/ask-helper";
import { traceStepEnd, finalizeTrace, traceLogFinalContextDetail } from "../utils/trace";
import type { D1Database } from "@cloudflare/workers-types";

function buildFinalResponse(args: {
  ok: boolean;
  threadId: string;
  route: string;
  answer: string;
  outcome: string;
  tokensUsed: number;
  source: string;
  meta?: Record<string, any>;
}) {
  return {
    ok: args.ok,
    threadId: args.threadId,
    route: args.route,
    answer: args.answer,
    outcome: args.outcome,
    usage: {
      tokensUsed: args.tokensUsed,
    },
    meta: args.meta || {},
  };
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

type SharedAskSuccess = {
  ok: true;
  threadId: string;
  route: string;
  answer: string;
  outcome: string;
  tokensUsed: number;
  source: string;
  meta?: Record<string, any>;
  startedAt: number;
};

type SharedAskFailure = {
  ok: false;
  status: StatusCode;
  error: string;
};

function chunkTextForSSE(text: string, chunkSize = 32) {
  const source = String(text || "");
  if (!source) return [];

  const chunks: string[] = [];
  for (let i = 0; i < source.length; i += chunkSize) {
    chunks.push(source.slice(i, i + chunkSize));
  }
  return chunks;
}

async function persistDirectRoute(args: {
  c: Context<Env>;
  userId: string;
  threadId: string;
  message: string;
  answer: string;
  tokensUsed: number;
  trace: any;
}) {
  const { c, userId, threadId, message, answer, tokensUsed, trace } = args;

  const db = c.env.DB as unknown as D1Database;
  const keepDev = true;
  const finalTrace = finalizeTrace(trace, keepDev);

  c.executionCtx.waitUntil(
    persist(
      db,
      userId,
      threadId,
      message,
      answer,
      "",
      tokensUsed,
      true,
      JSON.stringify(finalTrace)
    ).catch((e) => {
      logError("persist_failed", e, { userId, threadId });
    })
  );
}

async function runSharedAskLogic(
  c: Context<Env>,
  payload: any
): Promise<SharedAskSuccess | SharedAskFailure> {
  const prep = await preparePipeline(c, payload);

  if (!prep.ok) {
    console.error("[ask] Prepare failed:", prep.error);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: prep.error || "Preparation failed",
    };
  }

  if (prep.directRoute) {
    traceStepEnd(prep.trace, "final_execution", 0, {
      source: "direct_route",
      route: prep.route,
      ok: true,
      tokensUsed: prep.directRoute.tokensUsed,
    });

    await persistDirectRoute({
      c,
      userId: prep.userId,
      threadId: prep.threadId,
      message: prep.message,
      answer: prep.directRoute.answer,
      tokensUsed: prep.directRoute.tokensUsed,
      trace: prep.trace,
    });

    return {
      ok: true,
      threadId: prep.threadId,
      route: prep.route,
      answer: prep.directRoute.answer,
      outcome: "direct_route",
      tokensUsed: prep.directRoute.tokensUsed,
      source: "direct_route",
      startedAt: prep.startedAt,
    };
  }

  let retrieve: Awaited<ReturnType<typeof retrievePipeline>>;
  try {
    retrieve = await retrievePipeline(
      c,
      prep.trace,
      prep.apiKey,
      prep.chains,
      prep.policy,
      prep.limits,
      prep.embedding,
      prep.query,
      prep.historyPreview
    );
  } catch (retrieveError: any) {
    console.error("[ask] Retrieve failed:", retrieveError?.message || retrieveError);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: `Retrieval stage failed: ${retrieveError?.message || "Unknown error"}`,
    };
  }

  traceLogFinalContextDetail(prep.trace, retrieve.status, retrieve.context, retrieve.pieces);

  const executed = await executePipeline({
    c,
    trace: prep.trace,
    policy: prep.policy,
    question: prep.query,
    threadId: prep.threadId,
    userId: prep.userId,
    context: retrieve.context,
    language: prep.language,
    historyPreview: prep.historyPreview,
    assistantName: prep.assistantName,
    domainHint: prep.domainHint,
    fallbackMessage: prep.fallbackMessage,
    chains: prep.chains,
    startedAt: prep.startedAt,
    localEvidence: retrieve.localEvidence,
  });

  return {
    ok: true,
    threadId: prep.threadId,
    route: prep.route,
    answer: executed.answer,
    outcome: executed.outcome,
    tokensUsed: executed.tokensUsed,
    source: executed.source,
    startedAt: prep.startedAt,
  };
}

type StreamingAskSuccess = {
  ok: true;
  prep: Awaited<ReturnType<typeof preparePipeline>>;
  retrieve?: Awaited<ReturnType<typeof retrievePipeline>>;
};

type StreamingAskFailure = {
  ok: false;
  status: StatusCode;
  error: string;
};

async function runStreamingPreparation(
  c: Context<Env>,
  payload: any
): Promise<StreamingAskSuccess | StreamingAskFailure> {
  const prep = await preparePipeline(c, payload);

  if (!prep.ok) {
    return {
      ok: false,
      status: 400 as StatusCode,
      error: prep.error || "Preparation failed",
    };
  }

  if (prep.directRoute) {
    return { ok: true, prep };
  }

  try {
    const retrieve = await retrievePipeline(
      c,
      prep.trace,
      prep.apiKey,
      prep.chains,
      prep.policy,
      prep.limits,
      prep.embedding,
      prep.query,
      prep.historyPreview
    );

    traceLogFinalContextDetail(prep.trace, retrieve.status, retrieve.context, retrieve.pieces);
    return { ok: true, prep, retrieve };
  } catch (retrieveError: any) {
    console.error("[ask/stream] Retrieve failed:", retrieveError?.message || retrieveError);
    return {
      ok: false,
      status: 400 as StatusCode,
      error: `Retrieval stage failed: ${retrieveError?.message || "Unknown error"}`,
    };
  }
}

export const askController = {
  /**
   * Ask endpoint: /ask
   * Returns JSON response
   */
  ask: async (c: Context<Env>) => {
    let payload: any = {};
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const t0 = now();

    try {
      const result = await runSharedAskLogic(c, payload);

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            error: result.error,
          },
          result.status
        );
      }

      return c.json(
        buildFinalResponse({
          ok: true,
          threadId: result.threadId,
          route: result.route,
          answer: result.answer,
          outcome: result.outcome,
          tokensUsed: result.tokensUsed,
          source: result.source,
          meta: result.meta,
        }),
        200
      );
    } catch (err: any) {
      console.error("[ask] Controller error:", err?.message || err);
      return c.json(
        {
          ok: false,
          error: err?.message || "Ask request failed",
        },
        500 as StatusCode
      );
    }
  },

  /**
   * Streaming ask endpoint: /ask/stream
   * Returns SSE stream of answer tokens
   */
  askStream: async (c: Context<Env>) => {
    let payload: any = {};
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "Invalid JSON" }, 400);
    }

    try {
      const result = await runStreamingPreparation(c, payload);

      if (!result.ok) {
        return c.json(
          {
            ok: false,
            error: result.error,
          },
          result.status
        );
      }

      const sseGenerator = async function* () {
        const prep = result.prep;
        try {
          yield formatSSEMetaEvent({
            threadId: prep.threadId,
            route: prep.route,
            ok: true,
            startedAt: prep.startedAt,
          });

          if (prep.directRoute) {
            let position = 0;
            for (const chunk of chunkTextForSSE(prep.directRoute.answer)) {
              yield formatSSETokenEvent({
                chunk,
                position,
              });
              position += chunk.length;
            }

            traceStepEnd(prep.trace, "final_execution", 0, {
              source: "direct_route",
              route: prep.route,
              ok: true,
              tokensUsed: prep.directRoute.tokensUsed,
            });

            await persistDirectRoute({
              c,
              userId: prep.userId,
              threadId: prep.threadId,
              message: prep.message,
              answer: prep.directRoute.answer,
              tokensUsed: prep.directRoute.tokensUsed,
              trace: prep.trace,
            });

            yield formatSSEDoneEvent({
              threadId: prep.threadId,
              route: prep.route,
              answer: prep.directRoute.answer,
              ok: true,
              tokensUsed: prep.directRoute.tokensUsed,
              timing: { ms: now() - prep.startedAt },
            });
            return;
          }

          const retrieve = result.retrieve!;
          const executed = await executePipeline({
            c,
            trace: prep.trace,
            policy: prep.policy,
            question: prep.query,
            threadId: prep.threadId,
            userId: prep.userId,
            context: retrieve.context,
            language: prep.language,
            historyPreview: prep.historyPreview,
            assistantName: prep.assistantName,
            domainHint: prep.domainHint,
            fallbackMessage: prep.fallbackMessage,
            chains: prep.chains,
            startedAt: prep.startedAt,
            localEvidence: retrieve.localEvidence,
          });

          let answer = "";
          let position = 0;
          for (const chunk of chunkTextForSSE(executed.answer)) {
            answer += chunk;
            yield formatSSETokenEvent({
              chunk,
              position,
            });
            position += chunk.length;
          }

          yield formatSSEDoneEvent({
            threadId: prep.threadId,
            route: prep.route,
            answer,
            ok: true,
            tokensUsed: executed.tokensUsed,
            timing: { ms: now() - prep.startedAt },
          });
        } catch (streamError: any) {
          logError("stream_generation_error", streamError);

          yield formatSSEErrorEvent({
            message: streamError?.message || "Stream generation failed",
            ok: false,
            code: "STREAM_ERROR",
          });
        }
      };

      return createSSEResponse(sseGenerator(), 200);
    } catch (err: any) {
      console.error("[ask/stream] Controller error:", err?.message || err);
      return c.json(
        {
          ok: false,
          error: err?.message || "Ask stream request failed",
        },
        500 as StatusCode
      );
    }
  },
};

// Export for fallback/legacy
export async function runDummyAsk(c: Context<Env>, payload: any) {
  return await askController.ask(c);
}
