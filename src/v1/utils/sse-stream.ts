/**
 * sse-stream.ts (Enhanced)
 *
 * Server-Sent Events (SSE) streaming utilities for real-time answer streaming.
 *
 * Provides:
 * - formatSSEEvent: Proper SSE formatting per spec
 * - streamTextGenerator: Converts LangChain AsyncGenerator to SSE events
 * - createSSEResponse: Hono Response object with proper SSE headers
 * - Event types: meta, token, done, error
 */

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

/**
 * SSE Event structure
 */
export type SSEEvent = {
  event: string;
  data: any;
  id?: string;
};

/**
 * SSE Event Type: metadata about the stream (threadId, route, etc)
 */
export type SSEMetaEvent = {
  threadId: string;
  route: string;
  ok: boolean;
  startedAt?: number;
};

/**
 * SSE Event Type: a token/chunk from the answer
 */
export type SSETokenEvent = {
  chunk: string;
  position: number; // Character position in final answer
};

/**
 * SSE Event Type: stream completion
 */
export type SSEDoneEvent = {
  threadId: string;
  route: string;
  answer: string;
  ok: boolean;
  tokensUsed?: number;
  timing?: {
    ms: number;
  };
};

/**
 * SSE Event Type: error during streaming
 */
export type SSEErrorEvent = {
  message: string;
  ok: false;
  code?: string;
};

/* -------------------------------------------------------------------------- */
/*                              UTILITIES                                     */
/* -------------------------------------------------------------------------- */

/**
 * Format an event for SSE transmission.
 * Follows SSE spec: event:...\ndata:...\n\n
 */
export function formatSSEEvent(evt: SSEEvent): string {
  let message = "";

  if (evt.id) {
    message += `id: ${evt.id}\n`;
  }

  message += `event: ${evt.event}\n`;
  message += `data: ${JSON.stringify(evt.data)}\n\n`;

  return message;
}

/**
 * Format a meta event (stream metadata)
 */
export function formatSSEMetaEvent(evt: SSEMetaEvent): string {
  return formatSSEEvent({
    event: "meta",
    data: evt,
  });
}

/**
 * Format a token event (answer chunk)
 */
export function formatSSETokenEvent(evt: SSETokenEvent): string {
  return formatSSEEvent({
    event: "token",
    data: evt,
  });
}

/**
 * Format a done event (stream completion)
 */
export function formatSSEDoneEvent(evt: SSEDoneEvent): string {
  return formatSSEEvent({
    event: "done",
    data: evt,
  });
}

/**
 * Format an error event
 */
export function formatSSEErrorEvent(evt: SSEErrorEvent): string {
  return formatSSEEvent({
    event: "error",
    data: evt,
  });
}

/* -------------------------------------------------------------------------- */
/*                        STREAM GENERATION LOGIC                             */
/* -------------------------------------------------------------------------- */

/**
 * Stream text generation with chunked tokens
 * Usage in Hono:
 *   const stream = streamTextGenerator(chain, inputs);
 *   return createSSEResponse(stream);
 */
export async function* streamTextGenerator(
  chain: any,
  inputs: Record<string, any>,
  onChunk?: (chunk: string) => void
): AsyncGenerator<string, void, unknown> {
  let fullText = "";
  let eventId = 0;

  try {
    // Use LangChain streaming if available
    const stream = await chain.stream(inputs);

    for await (const chunk of stream) {
      const text = typeof chunk === "string" ? chunk : chunk.content || "";

      if (text) {
        fullText += text;
        eventId++;

        // Optional logging/callback
        if (onChunk) {
          onChunk(text);
        }

        // Emit chunked token event
        const tokenEvent: SSETokenEvent = {
          chunk: text,
          position: fullText.length,
        };

        yield formatSSETokenEvent(tokenEvent);
      }
    }

    // Stream completed successfully
    yield "\n\n"; // Final delimiter

  } catch (error: any) {
    // Error during streaming
    const errorEvent: SSEErrorEvent = {
      message: error?.message || "Unknown streaming error",
      ok: false,
      code: "STREAM_ERROR",
    };

    yield formatSSEErrorEvent(errorEvent);
  }
}

/**
 * Create a proper SSE Response object for Hono.
 *
 * Sets correct headers and returns a response with streaming body.
 */
export function createSSEResponse(
  generator: AsyncGenerator<string, void, unknown>,
  statusCode: number = 200
): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await generator.next();

        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      try {
        await generator.return?.();
      } catch {}
    },
  });

  return new Response(readable, {
    status: statusCode,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Accel-Buffering": "no", // Disable proxy buffering
    },
  });
}

/**
 * Alternative: Create SSE response with meta event prefix.
 *
 * Emits meta event first, then delegates to generator.
 */
export async function* createSSEResponseWithMeta(
  metaData: SSEMetaEvent,
  generator: AsyncGenerator<string, void, unknown>
): AsyncGenerator<string, void, unknown> {
  // Emit meta event first
  yield formatSSEMetaEvent(metaData);

  // Then yield all generator events
  for await (const event of generator) {
    yield event;
  }
}
