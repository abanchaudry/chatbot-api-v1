// // src/v5/utils/trace.ts
// import { nanoid } from "nanoid";

// export type TraceLevel = "debug" | "info" | "warn" | "error";
// export type TraceVis = "public" | "dev";

// export type TraceEvent = {
//   ts: number;
//   level: TraceLevel;
//   vis: TraceVis;
//   scope: string;
//   name: string;
//   data?: Record<string, any>;
// };

// export type TraceTimings = Record<string, number>;

// export type TraceRetrieval = {
//   vectorHits: any[];
//   webHits: any[];
//   pdfHits: any[];
// };

// export type TraceShape = {
//   traceId: string;

//   userId: string;
//   threadId: string;
//   message: string;
//   resolvedQuestion?: string;

//   language?: string;
//   assistantName?: string;
//   domainHint?: string;

//   flags?: Record<string, any>;

//   timings: TraceTimings;
//   retrieval: TraceRetrieval;

//   // Optional convenience mirrors
//   vectorHits?: any[];
//   webHits?: any[];
//   pdfHits?: any[];

//   // Latest per scope mirrors
//   request?: any;
//   history?: any;
//   preflight?: any;
//   router?: any;
//   planner?: any;
//   embed?: any;
//   vector?: any;
//   web?: any;
//   pdf?: any;
//   fusion?: any;
//   rerank?: any;
//   gate?: any;
//   verifier?: any;
//   context?: any;
//   answer?: any;
//   persist?: any;

//   logs: TraceEvent[];
//   events?:any
// };

// const MAX_EVENTS = 900;
// const MAX_STRING = 2600;

// // DB safety
// const MAX_TEXT_FIELD = 26_000;
// const MAX_HITS_PER_SOURCE = 60;
// const MAX_SELECTED_PIECES = 22;
// const MAX_PIECE_TEXT = 2400;

// function safeJsonStringify(value: any, maxLen: number) {
//   try {
//     const s = JSON.stringify(value);
//     if (!s) return "";
//     return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
//   } catch {
//     const s = String(value ?? "");
//     return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
//   }
// }

// function clipStr(v: any, max = MAX_STRING) {
//   if (v && (typeof v === "object" || Array.isArray(v))) return safeJsonStringify(v, max);
//   const s = String(v ?? "");
//   return s.length > max ? s.slice(0, max) + "…" : s;
// }

// function sanitize(obj: any): any {
//   if (obj == null) return obj;

//   if (typeof obj === "string") return clipStr(obj, MAX_STRING);
//   if (typeof obj === "number" || typeof obj === "boolean") return obj;

//   if (Array.isArray(obj)) return obj.slice(0, 160).map((x) => sanitize(x));

//   if (typeof obj === "object") {
//     const out: Record<string, any> = {};
//     for (const k of Object.keys(obj)) {
//       const val = (obj as any)[k];
//       const lk = k.toLowerCase();

//       const isBigTextKey =
//         lk.includes("context") ||
//         lk.includes("text") ||
//         lk.includes("chunk") ||
//         lk.includes("body") ||
//         lk.includes("answer") ||
//         lk.includes("message") ||
//         lk.includes("prompt") ||
//         lk.includes("history") ||
//         lk.includes("stack");

//       if (isBigTextKey) {
//         if (val && (typeof val === "object" || Array.isArray(val))) out[k] = safeJsonStringify(val, MAX_TEXT_FIELD);
//         else out[k] = clipStr(val, MAX_TEXT_FIELD);
//       } else {
//         out[k] = sanitize(val);
//       }
//     }
//     return out;
//   }

//   return clipStr(obj, MAX_STRING);
// }

// function pushEvent(trace: TraceShape, ev: TraceEvent) {
//   trace.logs.push(ev);
//   if (trace.logs.length > MAX_EVENTS) trace.logs.splice(0, trace.logs.length - MAX_EVENTS);
// }

// function setLatestScopeMirror(trace: TraceShape, scope: string, data: any) {
//   if (scope === "request") trace.request = data;
//   if (scope === "history") trace.history = data;
//   if (scope === "preflight") trace.preflight = data;
//   if (scope === "router") trace.router = data;
//   if (scope === "planner") trace.planner = data;
//   if (scope === "embed") trace.embed = data;
//   if (scope === "vector") trace.vector = data;
//   if (scope === "web") trace.web = data;
//   if (scope === "pdf") trace.pdf = data;
//   if (scope === "fusion") trace.fusion = data;
//   if (scope === "rerank") trace.rerank = data;
//   if (scope === "gate") trace.gate = data;
//   if (scope === "verifier") trace.verifier = data;
//   if (scope === "context") trace.context = data;
//   if (scope === "answer") trace.answer = data;
//   if (scope === "persist") trace.persist = data;
// }

// export function newTrace(input: {
//   userId: string;
//   threadId: string;
//   message: string;
//   resolvedQuestion?: string;
//   language?: string;
//   assistantName?: string;
//   domainHint?: string;
//   flags?: Record<string, any>;
// }): TraceShape {
//   const traceId = `tr_${Date.now()}_${nanoid(7)}`;

//   const trace: TraceShape = {
//     traceId,
//     userId: input.userId,
//     threadId: input.threadId,
//     message: clipStr(input.message, 9000),
//     resolvedQuestion: clipStr(input.resolvedQuestion ?? "", 9000),

//     language: input.language ?? "english",
//     assistantName: input.assistantName ?? "",
//     domainHint: input.domainHint ?? "",
//     flags: input.flags ?? {},

//     timings: {},
//     retrieval: { vectorHits: [], webHits: [], pdfHits: [] },

//     vectorHits: [],
//     webHits: [],
//     pdfHits: [],

//     logs: [],
//   };

//   traceEvent(trace, "trace", "init", { traceId }, { level: "info", vis: "dev" });
//   return trace;
// }

// export function traceTiming(trace: TraceShape, key: string, ms: number) {
//   trace.timings[key] = Math.max(0, Math.round(ms || 0));
// }

// /**
//  * ✅ traceEvent supports BOTH:
//  *   1) NEW style: traceEvent(trace, scope, name, data, { level, vis })
//  *   2) OLD style: traceEvent(trace, scope, name, data, "info", "public")
//  */
// export function traceEvent(
//   trace: TraceShape,
//   scope: string,
//   name: string,
//   data?: Record<string, any>,
//   opts?: { level?: TraceLevel; vis?: TraceVis }
// ): void;
// export function traceEvent(
//   trace: TraceShape,
//   scope: string,
//   name: string,
//   data: Record<string, any> | undefined,
//   level?: TraceLevel,
//   vis?: TraceVis
// ): void;
// export function traceEvent(
//   trace: TraceShape,
//   scope: string,
//   name: string,
//   data?: Record<string, any>,
//   a?: any,
//   b?: any
// ) {
//   // Handle both signatures
//   const isOldStyle = typeof a === "string" || typeof b === "string";
//   const level: TraceLevel = isOldStyle ? ((a as TraceLevel) ?? "info") : ((a?.level as TraceLevel) ?? "info");
//   const vis: TraceVis = isOldStyle ? ((b as TraceVis) ?? "public") : ((a?.vis as TraceVis) ?? "public");

//   const ev: TraceEvent = {
//     ts: Date.now(),
//     level,
//     vis,
//     scope,
//     name,
//     data: data ? sanitize(data) : undefined,
//   };

//   pushEvent(trace, ev);
//   setLatestScopeMirror(trace, scope, ev.data);
// }

// export function traceError(
//   trace: TraceShape,
//   scope: string,
//   name: string,
//   err: any,
//   data?: Record<string, any>,
//   vis: TraceVis = "dev"
// ) {
//   const errStr =
//     err instanceof Error
//       ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
//       : String(err ?? "");
//   traceEvent(trace, scope, name, { err: clipStr(errStr, 2400), ...(data || {}) }, "error", vis);
// }

// // Optional convenience helpers
// export function tracePublic(trace: TraceShape, scope: string, name: string, data?: Record<string, any>, level: TraceLevel = "info") {
//   traceEvent(trace, scope, name, data, level, "public");
// }
// export function traceDev(trace: TraceShape, scope: string, name: string, data?: Record<string, any>, level: TraceLevel = "debug") {
//   traceEvent(trace, scope, name, data, level, "dev");
// }

// export function traceSetRetrievalHits(trace: TraceShape, source: "vector" | "web" | "pdf"| "autorag_web", hits: any[]) {
//   const safeHits = (hits || []).slice(0, MAX_HITS_PER_SOURCE).map((h) => sanitize(h));

//   if (source === "vector") trace.retrieval.vectorHits = safeHits;
//   if (source === "web") trace.retrieval.webHits = safeHits;
//   if (source === "pdf") trace.retrieval.pdfHits = safeHits;

//   if (source === "vector") trace.vectorHits = safeHits;
//   if (source === "web") trace.webHits = safeHits;
//   if (source === "pdf") trace.pdfHits = safeHits;
// }

// export function pieceToTraceFull(p: {
//   sourceType: string;
//   sourceId: string;
//   score?: number;
//   rawScore?: number;
//   priority?: number;
//   title?: string;
//   url?: string;
//   section?: string | number;
//   text?: string;
//   meta?: any;
// }) {
//   const rawText = String(p.text || "");
//   const clipped = rawText.length > MAX_PIECE_TEXT ? rawText.slice(0, MAX_PIECE_TEXT) + "…" : rawText;

//   return {
//     type: p.sourceType,
//     id: p.sourceId,
//     score: Number(p.score || 0),
//     rawScore: Number(p.rawScore || 0),
//     priority: Number(p.priority || 0),
//     title: p.title || "",
//     url: p.url || "",
//     section: String(p.section ?? ""),
//     text: clipped,
//     meta: p.meta ? sanitize(p.meta) : undefined,
//   };
// }

// export function piecesToTraceBadges(pieces: Array<{ sourceType?: string; score?: number; url?: string }>) {
//   const out: string[] = [];
//   const types = new Set<string>();

//   for (const p of pieces || []) {
//     if (p?.sourceType) types.add(String(p.sourceType).toUpperCase());
//   }

//   for (const t of types) out.push(t);

//   const top = pieces?.[0]?.score ?? 0;
//   if (top >= 80) out.push("STRONG");
//   else if (top >= 60) out.push("GOOD");
//   else if (top >= 40) out.push("BORDERLINE");
//   else if (pieces?.length) out.push("WEAK");

//   return out;
// }

// export function piecesToTraceFull(
//   pieces: Array<{
//     sourceType: string;
//     sourceId: string;
//     score?: number;
//     rawScore?: number;
//     priority?: number;
//     title?: string;
//     url?: string;
//     section?: string | number;
//     text?: string;
//     meta?: any;
//   }>,
//   max = MAX_SELECTED_PIECES
// ) {
//   return (pieces || []).slice(0, max).map(pieceToTraceFull);
// }

// export function traceSetFinalContext(trace: TraceShape, args: { selectedSource: string; pieces: any[]; finalContext: string }) {
//   traceEvent(
//     trace,
//     "context",
//     "final",
//     {
//       selectedSource: args.selectedSource,
//       used: (args.pieces || []).length,
//       usedPieces: piecesToTraceFull(args.pieces || []),
//       finalContext: clipStr(args.finalContext || "", MAX_TEXT_FIELD),
//       ctxChars: Number((args.finalContext || "").length),
//     },
//     "info",
//     "dev" // final context is dev-only by default
//   );
// }

// /**
//  * ✅ Use before saving to DB if you want to hide dev logs in normal mode
//  */
// export function finalizeTrace(trace: TraceShape, keepDev: boolean) {
//   if (keepDev) return trace;

//   return {
//     ...trace,
//     logs: (trace.logs || []).filter((e) => e.vis === "public"),
//     // optional: keep mirrors minimal
//     vector: undefined,
//     web: undefined,
//     pdf: undefined,
//     fusion: undefined,
//     rerank: undefined,
//     gate: undefined,
//     context: undefined,
//     answer: undefined,
//     persist: undefined,
//   } as TraceShape;
// }


// src/v5/utils/trace.ts
import { nanoid } from "nanoid";

export type TraceLevel = "debug" | "info" | "warn" | "error";
export type TraceVis = "public" | "dev";

export type TraceEvent = {
  ts: number;
  level: TraceLevel;
  vis: TraceVis;
  scope: string;
  name: string;
  data?: Record<string, any>;
};

export type TraceTimings = Record<string, number>;

export type TraceRetrieval = {
  vectorHits: any[];
  webHits: any[];
  pdfHits: any[];
  autoragHits: any[];
};

export type TraceShape = {
  traceId: string;

  userId: string;
  threadId: string;
  message: string;
  resolvedQuestion?: string;

  language?: string;
  assistantName?: string;
  domainHint?: string;

  flags?: Record<string, any>;

  timings: TraceTimings;
  retrieval: TraceRetrieval;

  // Optional convenience mirrors
  vectorHits?: any[];
  webHits?: any[];
  pdfHits?: any[];
  autoragHits?: any[];

  // Latest per scope mirrors
  request?: any;
  history?: any;
  preflight?: any;
  router?: any;
  planner?: any;
  embed?: any;
  vector?: any;
  web?: any;
  pdf?: any;
  autorag?: any;
  fusion?: any;
  rerank?: any;
  gate?: any;
  verifier?: any;
  context?: any;
  answer?: any;
  persist?: any;

  logs: TraceEvent[];
};

const MAX_EVENTS = 900;
const MAX_STRING = 2600;

// DB safety
const MAX_TEXT_FIELD = 26_000;
const MAX_HITS_PER_SOURCE = 60;
const MAX_SELECTED_PIECES = 22;
const MAX_PIECE_TEXT = 2400;

function safeJsonStringify(value: any, maxLen: number) {
  try {
    const s = JSON.stringify(value);
    if (!s) return "";
    return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
  } catch {
    const s = String(value ?? "");
    return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
  }
}

function clipStr(v: any, max = MAX_STRING) {
  if (v && (typeof v === "object" || Array.isArray(v))) return safeJsonStringify(v, max);
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function sanitize(obj: any): any {
  if (obj == null) return obj;

  if (typeof obj === "string") return clipStr(obj, MAX_STRING);
  if (typeof obj === "number" || typeof obj === "boolean") return obj;

  if (Array.isArray(obj)) return obj.slice(0, 160).map((x) => sanitize(x));

  if (typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj)) {
      const val = (obj as any)[k];
      const lk = k.toLowerCase();

      const isBigTextKey =
        lk.includes("context") ||
        lk.includes("text") ||
        lk.includes("chunk") ||
        lk.includes("body") ||
        lk.includes("answer") ||
        lk.includes("message") ||
        lk.includes("prompt") ||
        lk.includes("history") ||
        lk.includes("stack");

      if (isBigTextKey) {
        if (val && (typeof val === "object" || Array.isArray(val))) out[k] = safeJsonStringify(val, MAX_TEXT_FIELD);
        else out[k] = clipStr(val, MAX_TEXT_FIELD);
      } else {
        out[k] = sanitize(val);
      }
    }
    return out;
  }

  return clipStr(obj, MAX_STRING);
}

function pushEvent(trace: TraceShape, ev: TraceEvent) {
  trace.logs.push(ev);
  if (trace.logs.length > MAX_EVENTS) trace.logs.splice(0, trace.logs.length - MAX_EVENTS);
}

function setLatestScopeMirror(trace: TraceShape, scope: string, data: any) {
  if (scope === "request") trace.request = data;
  if (scope === "history") trace.history = data;
  if (scope === "preflight") trace.preflight = data;
  if (scope === "router") trace.router = data;
  if (scope === "planner") trace.planner = data;
  if (scope === "embed") trace.embed = data;
  if (scope === "vector") trace.vector = data;
  if (scope === "web") trace.web = data;
  if (scope === "pdf") trace.pdf = data;
  if (scope === "autorag") trace.autorag = data;
  if (scope === "fusion") trace.fusion = data;
  if (scope === "rerank") trace.rerank = data;
  if (scope === "gate") trace.gate = data;
  if (scope === "verifier") trace.verifier = data;
  if (scope === "context") trace.context = data;
  if (scope === "answer") trace.answer = data;
  if (scope === "persist") trace.persist = data;
}

export function newTrace(input: {
  userId: string;
  threadId: string;
  message: string;
  resolvedQuestion?: string;
  language?: string;
  assistantName?: string;
  domainHint?: string;
  flags?: Record<string, any>;
}): TraceShape {
  const traceId = `tr_${Date.now()}_${nanoid(7)}`;

  const trace: TraceShape = {
    traceId,
    userId: input.userId,
    threadId: input.threadId,
    message: clipStr(input.message, 9000),
    resolvedQuestion: clipStr(input.resolvedQuestion ?? "", 9000),

    language: input.language ?? "english",
    assistantName: input.assistantName ?? "",
    domainHint: input.domainHint ?? "",
    flags: input.flags ?? {},

    timings: {},
    retrieval: { vectorHits: [], webHits: [], pdfHits: [], autoragHits: [] },

    vectorHits: [],
    webHits: [],
    pdfHits: [],
    autoragHits: [],

    logs: [],
  };

  traceEvent(trace, "trace", "init", { traceId }, { level: "info", vis: "dev" });
  return trace;
}

export function traceTiming(trace: TraceShape, key: string, ms: number) {
  trace.timings[key] = Math.max(0, Math.round(ms || 0));
}

/**
 * ✅ traceEvent supports BOTH:
 *   1) NEW style: traceEvent(trace, scope, name, data, { level, vis })
 *   2) OLD style: traceEvent(trace, scope, name, data, "info", "public")
 */
export function traceEvent(
  trace: TraceShape,
  scope: string,
  name: string,
  data?: Record<string, any>,
  opts?: { level?: TraceLevel; vis?: TraceVis }
): void;
export function traceEvent(
  trace: TraceShape,
  scope: string,
  name: string,
  data: Record<string, any> | undefined,
  level?: TraceLevel,
  vis?: TraceVis
): void;
export function traceEvent(
  trace: TraceShape,
  scope: string,
  name: string,
  data?: Record<string, any>,
  a?: any,
  b?: any
) {
  const isOldStyle = typeof a === "string" || typeof b === "string";
  const level: TraceLevel = isOldStyle ? ((a as TraceLevel) ?? "info") : ((a?.level as TraceLevel) ?? "info");
  const vis: TraceVis = isOldStyle ? ((b as TraceVis) ?? "public") : ((a?.vis as TraceVis) ?? "public");

  const ev: TraceEvent = {
    ts: Date.now(),
    level,
    vis,
    scope,
    name,
    data: data ? sanitize(data) : undefined,
  };

  pushEvent(trace, ev);
  setLatestScopeMirror(trace, scope, ev.data);
}

export function traceError(
  trace: TraceShape,
  scope: string,
  name: string,
  err: any,
  data?: Record<string, any>,
  vis: TraceVis = "dev"
) {
  const errStr =
    err instanceof Error
      ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
      : String(err ?? "");
  traceEvent(trace, scope, name, { err: clipStr(errStr, 2400), ...(data || {}) }, "error", vis);
}

function normalizeRetrievalSource(
  source: string
): "vector" | "web" | "pdf" | "autorag_web" {
  const value = String(source || "").toLowerCase();

  if (value === "vector" || value.startsWith("vector_")) return "vector";
  if (value === "web" || value.startsWith("web_")) return "web";
  if (value === "pdf" || value.startsWith("pdf_")) return "pdf";
  return "autorag_web";
}

export function traceSetRetrievalHits(
  trace: TraceShape,
  source: "vector" | "web" | "pdf" | "autorag_web" | string,
  hits: any[]
) {
  const safeHits = (hits || []).slice(0, MAX_HITS_PER_SOURCE).map((h) => sanitize(h));
  const normalizedSource = normalizeRetrievalSource(source);

  if (normalizedSource === "vector") {
    trace.retrieval.vectorHits = safeHits;
    trace.vectorHits = safeHits;
    traceEvent(trace, "vector", "hits", { count: safeHits.length, topScore: safeHits[0]?.score ?? 0 }, "info", "dev");
    return;
  }
  if (normalizedSource === "web") {
    trace.retrieval.webHits = safeHits;
    trace.webHits = safeHits;
    traceEvent(trace, "web", "hits", { count: safeHits.length, topScore: safeHits[0]?.score ?? 0 }, "info", "dev");
    return;
  }
  if (normalizedSource === "pdf") {
    trace.retrieval.pdfHits = safeHits;
    trace.pdfHits = safeHits;
    traceEvent(trace, "pdf", "hits", { count: safeHits.length, topScore: safeHits[0]?.score ?? 0 }, "info", "dev");
    return;
  }

  // ✅ autorag_web
  trace.retrieval.autoragHits = safeHits;
  trace.autoragHits = safeHits;
  traceEvent(trace, "autorag", "hits", { count: safeHits.length, topScore: safeHits[0]?.score ?? 0 }, "info", "dev");
}

export function pieceToTraceFull(p: {
  sourceType: string;
  sourceId: string;
  score?: number;
  rawScore?: number;
  priority?: number;
  title?: string;
  url?: string;
  section?: string | number;
  text?: string;
  meta?: any;
}) {
  const rawText = String(p.text || "");
  const clipped = rawText.length > MAX_PIECE_TEXT ? rawText.slice(0, MAX_PIECE_TEXT) + "…" : rawText;

  return {
    type: p.sourceType,
    id: p.sourceId,
    score: Number(p.score || 0),
    rawScore: Number(p.rawScore || 0),
    priority: Number(p.priority || 0),
    title: p.title || "",
    url: p.url || "",
    section: String(p.section ?? ""),
    text: clipped,
    meta: p.meta ? sanitize(p.meta) : undefined,
  };
}

export function piecesToTraceFull(
  pieces: Array<{
    sourceType: string;
    sourceId: string;
    score?: number;
    rawScore?: number;
    priority?: number;
    title?: string;
    url?: string;
    section?: string | number;
    text?: string;
    meta?: any;
  }>,
  max = MAX_SELECTED_PIECES
) {
  return (pieces || []).slice(0, max).map(pieceToTraceFull);
}

export function traceSetFinalContext(trace: TraceShape, args: { selectedSource: string; pieces: any[]; finalContext: string }) {
  traceEvent(
    trace,
    "context",
    "final",
    {
      selectedSource: args.selectedSource,
      used: (args.pieces || []).length,
      usedPieces: piecesToTraceFull(args.pieces || []),
      finalContext: clipStr(args.finalContext || "", MAX_TEXT_FIELD),
      ctxChars: Number((args.finalContext || "").length),
    },
    "info",
    "dev"
  );
}

/**
 * ✅ Step helpers: ordered timeline in DB (admin can render these)
 * Uses scope="steps" and name="<step>:start|end|error"
 */
export function traceStepStart(trace: TraceShape, step: string, data?: Record<string, any>) {
  traceEvent(trace, "steps", `${step}:start`, data, { level: "info", vis: "dev" });
}

export function traceStepEnd(trace: TraceShape, step: string, ms: number, data?: Record<string, any>) {
  traceTiming(trace, step, ms);
  traceEvent(trace, "steps", `${step}:end`, { ms, ...(data || {}) }, { level: "info", vis: "dev" });
}

export function traceStepFail(trace: TraceShape, step: string, ms: number, err: any, data?: Record<string, any>) {
  traceTiming(trace, step, ms);
  traceError(trace, "steps", `${step}:error`, err, { ms, ...(data || {}) }, "dev");
}

export async function traceSpan<T>(
  trace: TraceShape,
  step: string,
  fn: () => Promise<T>,
  dataStart?: Record<string, any>,
  dataEnd?: (res: T) => Record<string, any>
): Promise<T> {
  const t0 = Date.now();
  traceStepStart(trace, step, dataStart);
  try {
    const res = await fn();
    traceStepEnd(trace, step, Date.now() - t0, dataEnd ? dataEnd(res) : undefined);
    return res;
  } catch (e) {
    traceStepFail(trace, step, Date.now() - t0, e, dataStart);
    throw e;
  }
}

/**
 * ✅ Log retrieved chunks BEFORE reranking (for debugging retrieval quality)
 */
export function traceLogRetrievedChunks(
  trace: TraceShape,
  passLabel: string,
  chunks: Array<{
    sourceType: string;
    sourceId: string;
    score?: number;
    rawScore?: number;
    title?: string;
    section?: string;
    text?: string;
    meta?: any;
  }>
) {
  const summary = chunks.slice(0, 15).map((c, idx) => ({
    idx: idx + 1,
    type: c.sourceType,
    score: Math.round(c.score || 0),
    section: String(c.section || "").slice(0, 60),
    titlePreview: String(c.title || "").slice(0, 80),
  }));

  traceEvent(
    trace,
    `retrieval_${passLabel}`,
    "chunks_before_rerank",
    {
      totalCount: chunks.length,
      topScore: Math.round((chunks[0]?.score || 0)),
      avgScore: Math.round(
        chunks.reduce((sum, c) => sum + (c.score || 0), 0) / Math.max(1, chunks.length)
      ),
      chunksPreview: summary,
    },
    { level: "info", vis: "dev" }
  );
}

/**
 * ✅ Log reranked chunks AFTER LLM reranking (for debugging ranking results)
 */
export function traceLogRankedChunks(
  trace: TraceShape,
  passLabel: string,
  chunks: Array<{
    sourceType: string;
    sourceId: string;
    score?: number;
    rawScore?: number;
    title?: string;
    section?: string;
    text?: string;
    meta?: any;
  }>,
  beforeCount: number
) {
  const summary = chunks.slice(0, 12).map((c, idx) => ({
    idx: idx + 1,
    type: c.sourceType,
    score: Math.round(c.score || 0),
    section: String(c.section || "").slice(0, 60),
    titlePreview: String(c.title || "").slice(0, 80),
  }));

  traceEvent(
    trace,
    `rerank_${passLabel}`,
    "chunks_after_rerank",
    {
      beforeCount,
      afterCount: chunks.length,
      reductionPct: Math.round(((beforeCount - chunks.length) / beforeCount) * 100) || 0,
      topScore: Math.round(chunks[0]?.score || 0),
      avgScore: Math.round(
        chunks.reduce((sum, c) => sum + (c.score || 0), 0) / Math.max(1, chunks.length)
      ),
      chunksPreview: summary,
    },
    { level: "info", vis: "dev" }
  );
}

/**
 * ✅ Log final context detail BEFORE answer generation
 */
export function traceLogFinalContextDetail(
  trace: TraceShape,
  selectedSource: string,
  finalContext: string,
  pieces: Array<{
    sourceType: string;
    sourceId: string;
    score?: number;
    title?: string;
    section?: string;
    text?: string;
  }>
) {
  const contextChars = finalContext.length;
  const contextTokens = Math.ceil(contextChars / 4); // Rough estimate

  const pieceSummary = (pieces || []).slice(0, 20).map((p, idx) => ({
    idx: idx + 1,
    type: p.sourceType,
    score: Math.round(p.score || 0),
    section: String(p.section || "").slice(0, 50),
    textLength: String(p.text || "").length,
  }));

  traceEvent(
    trace,
    "context_detail",
    "final_context_assembled",
    {
      selectedSource,
      totalPieces: pieces?.length || 0,
      contextChars,
      contextTokensEst: contextTokens,
      pieceSummary,
      contextPreview: clipStr(finalContext, 500), // Show first 500 chars
    },
    { level: "info", vis: "dev" }
  );
}

/**
 * ✅ Log answer generation detail AFTER answer is generated
 */
export function traceLogAnswerGeneration(
  trace: TraceShape,
  answer: string,
  source: "primary_rag" | "rescue_autorag" | "fallback",
  tokensUsed: number
) {
  const answerChars = answer.length;
  const answerTokens = Math.ceil(answerChars / 4); // Rough estimate

  traceEvent(
    trace,
    "answer_detail",
    "answer_generated",
    {
      source,
      answerChars,
      answerTokensEst: answerTokens,
      tokensUsedTotal: tokensUsed,
      answerPreview: clipStr(answer, 500), // Show first 500 chars
      answerLines: (answer.match(/\n/g) || []).length + 1,
    },
    { level: "info", vis: "dev" }
  );
}

/**
 * ✅ Use before saving to DB if you want to hide dev logs in normal mode
 */
export function finalizeTrace(trace: TraceShape, keepDev: boolean) {
  if (keepDev) return trace;

  return {
    ...trace,
    logs: (trace.logs || []).filter((e) => e.vis === "public"),
    vector: undefined,
    web: undefined,
    pdf: undefined,
    autorag: undefined,
    fusion: undefined,
    rerank: undefined,
    gate: undefined,
    context: undefined,
    answer: undefined,
    persist: undefined,
  } as TraceShape;
}
