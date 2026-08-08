// src/v5/utils/preflight.parse.ts
export type PreflightRoute =
  | "SMALL_TALK"
  | "LANGUAGE_MISMATCH"
  | "NEEDS_CLARIFICATION"
  | "ANSWER_WITH_RAG";

export type PreflightOut = {
  route: PreflightRoute;
  languageOk: boolean;
  detectedLanguage: "english" | "spanish" | "other";
  hasGreeting: boolean;
  isGreetingOnly: boolean;
  isFollowUp: boolean;
  rewrittenQuestion: string;
  subQueries: string[];
  reason: string;
};

function asBool(v: any) {
  return v === true;
}

function asStr(v: any) {
  return String(v ?? "");
}

function normalizeRoute(v: any): PreflightRoute {
  const s = asStr(v);
  return (["SMALL_TALK", "LANGUAGE_MISMATCH", "NEEDS_CLARIFICATION", "ANSWER_WITH_RAG"].includes(s)
    ? s
    : "ANSWER_WITH_RAG") as PreflightRoute;
}

function normalizeLang(v: any): "english" | "spanish" | "other" {
  const s = asStr(v);
  return (["english", "spanish", "other"].includes(s) ? s : "other") as any;
}

export function parsePreflight(raw: string): PreflightOut {
  let obj: any = null;

  try {
    obj = JSON.parse(raw);
  } catch {
    // attempt to recover if model adds junk
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) obj = JSON.parse(raw.slice(start, end + 1));
    else throw new Error("preflight_invalid_json");
  }

  const rawSubQueries = Array.isArray(obj?.subQueries) ? obj.subQueries.map((s: any) => asStr(s).trim()).filter(Boolean) : [];
  const rewritten = asStr(obj?.rewrittenQuestion || "");

  let out: PreflightOut = {
    route: normalizeRoute(obj?.route),
    languageOk: asBool(obj?.languageOk),
    detectedLanguage: normalizeLang(obj?.detectedLanguage),

    hasGreeting: asBool(obj?.hasGreeting),
    isGreetingOnly: asBool(obj?.isGreetingOnly),
    isFollowUp: asBool(obj?.isFollowUp),

    rewrittenQuestion: rewritten,
    subQueries: rawSubQueries.length > 0 ? rawSubQueries : (rewritten ? [rewritten] : []),
    reason: asStr(obj?.reason || ""),
  };

  // Consistency rule: greeting-only must always be SMALL_TALK
  if (out.isGreetingOnly) {
    out.route = "SMALL_TALK";
    out.rewrittenQuestion = "";
    return out;
  }

  // If model picked SMALL_TALK but accidentally produced a real rewrite, trust the rewrite
  if (out.route === "SMALL_TALK" && out.rewrittenQuestion.trim()) {
    out.route = "ANSWER_WITH_RAG";
  }

  // Safety: rewrittenQuestion must be empty when not RAG
  if (out.route !== "ANSWER_WITH_RAG") out.rewrittenQuestion = "";

  // Safety: if route is RAG but rewrite is empty, keep the RAG route.
  // Downstream logic already falls back to the original message.
  if (out.route === "ANSWER_WITH_RAG" && !out.rewrittenQuestion.trim()) {
    out.rewrittenQuestion = "";
  }

  return out;
}
