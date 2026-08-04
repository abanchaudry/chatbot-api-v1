import type { Env } from "../types/env";

export type AiSearchChunk = {
  id: string;
  score: number; // 0..1
  text: string;
  type?: string;
  url?: string;
  title?: string;
  metadata?: Record<string, any>;
};

export type TraceLog = {
  info: (scope: string, name: string, data?: any) => void;
  warn: (scope: string, name: string, data?: any) => void;
  error: (scope: string, name: string, data?: any) => void;
};

function safeJsonParse<T = any>(s: string): T | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function safeStr(v: any, max = 900) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function safeBoolEnv(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function pickApiToken(env: Env["Bindings"]) {
  return String(
    (env as any).CF_AI_SEARCH_TOKEN ||
      (env as any).CF_SEARCH_AI_API_TOKEN ||
      (env as any).CF_API_TOKEN ||
      ""
  ).trim();
}

function buildHeaders(env: Env["Bindings"]) {
  const token = pickApiToken(env);
  if (!token) {
    throw new Error(
      "ai_search: missing CF_AI_SEARCH_TOKEN (or CF_SEARCH_AI_API_TOKEN / CF_API_TOKEN)"
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function firstHttpUrlFromText(text: string): string {
  const s = String(text || "");
  const m = s.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0].replace(/[),.;]+$/g, "") : "";
}

function normalizeUrl(u?: string) {
  const s = String(u || "").trim();
  if (!s) return "";
  try {
    const url = new URL(s);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    const href = url.toString();
    return href.endsWith("/") ? href.slice(0, -1) : href;
  } catch {
    return "";
  }
}

function inferUrlFromMetadata(meta: any): string {
  if (!meta) return "";
  const candidates = [
    meta.url,
    meta.source_url,
    meta.sourceUrl,
    meta.link,
    meta.page_url,
    meta.pageUrl,
    meta.document_url,
    meta.documentUrl,
    meta.file_url,
    meta.fileUrl,
  ];
  for (const c of candidates) {
    const u = normalizeUrl(c);
    if (u) return u;
  }
  return "";
}

/**
 * Cloudflare AI Search Instance endpoint:
 * POST /ai-search/instances/{instanceId}/search
 */
export async function aiSearchTextList(
  env: Env["Bindings"],
  instanceId: string,
  query: string,
  topK: number,
  opts?: { traceId?: string; kind?: "web" | "pdf"; traceLog?: TraceLog }
): Promise<AiSearchChunk[]> {
  const traceId = String(opts?.traceId || "");
  const kind = (opts?.kind || "web") as "web" | "pdf";
  const L = opts?.traceLog;

  if (!instanceId) {
    L?.warn(kind, "ai_search_skipped_no_instance", { traceId, kind });
    return [];
  }

  const accountId = String((env as any).CF_ACCOUNT_ID || "").trim();
  if (!accountId) {
    L?.error(kind, "ai_search_missing_account_id", { traceId, kind });
    return [];
  }

  const enableRewrite = safeBoolEnv((env as any).CF_AI_SEARCH_REWRITE_QUERY);
  const enableRerank = safeBoolEnv((env as any).CF_AI_SEARCH_RERANK);

  L?.info(kind, "ai_search_env_check", {
    traceId,
    kind,
    instanceId,
    hasToken: !!pickApiToken(env),
    accountIdPrefix: accountId.slice(0, 6) + "...",
    topK,
    qLen: String(query?.length || 0),
    rewrite: enableRewrite,
    rerank: enableRerank,
  });

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${instanceId}/search`;

  const body: any = {
    messages: [{ role: "user", content: String(query || "") }],
    top_k: Math.max(1, Math.min(50, Number(topK) || 20)),
    rewrite_query: enableRewrite,
    rerank: enableRerank,
  };

  const t0 = Date.now();
  L?.info(kind, "ai_search_fetch_start", {
    traceId,
    kind,
    instanceId,
    topK: body.top_k,
  });

  let res: Response;
  let txt = "";

  try {
    res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(env),
      body: JSON.stringify(body),
    });
    txt = await res.text();
  } catch (e: any) {
    L?.error(kind, "ai_search_fetch_error", {
      traceId,
      kind,
      ms: Date.now() - t0,
      err: String(e?.message || e),
    });
    return [];
  }

  if (!res.ok) {
    const parsed = safeJsonParse<any>(txt);
    L?.error(kind, "ai_search_http_error", {
      traceId,
      kind,
      ms: Date.now() - t0,
      status: res.status,
      body: safeStr(parsed?.errors || parsed?.result?.errors || parsed || txt, 1200),
    });
    return [];
  }

  const json = safeJsonParse<any>(txt);
  const chunks = (json?.result?.chunks || []) as any[];

  const mapped: AiSearchChunk[] = chunks
    .map((c) => {
      const meta = c?.item?.metadata || c?.metadata || undefined;

      const rawText = String(c?.text ?? "");
      const urlFromMeta = inferUrlFromMetadata(meta);
      const urlFromText = normalizeUrl(firstHttpUrlFromText(rawText));
      const finalUrl = urlFromMeta || urlFromText || "";

      const title =
        (meta?.title ? String(meta.title) : "") ||
        (c?.item?.metadata?.title ? String(c.item.metadata.title) : "") ||
        (c?.title ? String(c.title) : "");

      return {
        id: String(c?.id ?? ""),
        score: Number(c?.score ?? 0),
        text: rawText,
        type: c?.type ? String(c.type) : undefined,
        url: finalUrl || undefined,
        title: title ? String(title) : undefined,
        metadata: meta,
      };
    })
    .filter((c) => c.id && c.text);

  mapped.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  L?.info(kind, "ai_search_fetch_ok", {
    traceId,
    kind,
    ms: Date.now() - t0,
    status: res.status,
    count: mapped.length,
    topScore: mapped[0]?.score ?? 0,
  });

  return mapped;
}