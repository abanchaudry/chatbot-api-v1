// src/v5/utils/dedupe.ts
export type DedupeItem = {
  type: string; // "web" | "vector" | "pdf" etc
  id?: string;
  sourceId?: string;
  url?: string;
  title?: string;
  section?: string;
  text?: string;
};

function safe(s?: string) {
  return (s || "").trim();
}

// Prefer: (type + sourceId/id). If missing, fallback to URL, then title, then text prefix.
export function dedupeKey(x: DedupeItem) {
  const sourceId = safe(x.sourceId);
  if (sourceId) return `${x.type}|sid:${sourceId}`;

  const id = safe(x.id);
  if (id) return `${x.type}|id:${id}`;

  const url = safe(x.url);
  if (url) return `${x.type}|url:${url}`;

  const title = safe(x.title);
  const section = safe(x.section);
  if (title || section) return `${x.type}|t:${title}|s:${section}`;

  const prefix = safe(x.text).slice(0, 240);
  return `${x.type}|p:${prefix}`;
}

export function dedupeKeepFirst<T extends DedupeItem>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = dedupeKey(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
