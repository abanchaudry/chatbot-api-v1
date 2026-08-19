import { KVNamespace, VectorizeIndex } from '@cloudflare/workers-types';

export interface CachedQueryResponse {
  cacheHit: boolean;
  question: string;
  answer: string;
  context: string;
  sources: any[];
  latencyMs: number;
  cacheLayer: string;
}

export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
}

export async function generateSha256Hash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getCachedQueryResponse(
  cache: KVNamespace,
  question: string,
  datasetSignature?: string
): Promise<CachedQueryResponse | null> {
  const start = performance.now();
  const normalized = normalizeQuery(question);

  if (normalized.length <= 3) {
    return null;
  }

  try {
    const hash = await generateSha256Hash(normalized);
    const key = datasetSignature ? `qcache:${datasetSignature}:${hash}` : `qcache:${hash}`;
    const data = await cache.get(key, 'json');

    if (data) {
      const payload = data as any;
      return {
        cacheHit: true,
        question,
        answer: payload.answer,
        context: payload.context,
        sources: payload.sources || [],
        latencyMs: performance.now() - start,
        cacheLayer: 'L1_KV_EXACT',
      };
    }
  } catch (error) {
    // Silently handle error
  }

  return null;
}

export function extractNumbersAndIdentifiers(text: string): string[] {
  const matches = String(text || "").match(/\b\d+(?:\.\d+)*\b|\b[a-z]{2,}\s*\d+(?:\.\d+)*\b/gi) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase().replace(/\s+/g, ""))));
}

export function doIdentifiersMatch(query1: string, query2: string): boolean {
  const ids1 = extractNumbersAndIdentifiers(query1);
  const ids2 = extractNumbersAndIdentifiers(query2);

  if (ids1.length > 0 || ids2.length > 0) {
    if (ids1.length !== ids2.length) return false;
    ids1.sort();
    ids2.sort();
    return ids1.every((val, idx) => val === ids2[idx]);
  }

  return true;
}

export async function saveQueryResponseToCache(
  cache: KVNamespace,
  question: string,
  payload: { answer: string; context: string; sources: any[]; tokensUsed?: number; question?: string },
  datasetSignature?: string
): Promise<boolean> {
  const normalized = normalizeQuery(question);

  if (normalized.length <= 3) {
    return false;
  }

  try {
    const hash = await generateSha256Hash(normalized);
    const key = datasetSignature ? `qcache:${datasetSignature}:${hash}` : `qcache:${hash}`;
    const fullPayload = { ...payload, question };
    await cache.put(key, JSON.stringify(fullPayload), { expirationTtl: 86400 });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getSemanticCacheHit(
  vectorizeCache: VectorizeIndex | undefined,
  embedding: number[] | null,
  kvCache: KVNamespace,
  incomingQuestion?: string,
  datasetSignature?: string
): Promise<{ hit: boolean; answer?: string; score?: number; latencyMs?: number }> {
  const start = performance.now();

  if (!vectorizeCache || !embedding) {
    return { hit: false };
  }

  try {
    const results = await vectorizeCache.query(embedding, { topK: 1 });
    if (results.matches && results.matches.length > 0) {
      const match = results.matches[0];
      if (match.score >= 0.95) {
        const queryHash = match.id;
        const key = datasetSignature ? `qcache:${datasetSignature}:${queryHash}` : `qcache:${queryHash}`;
        const data = await kvCache.get<{ answer: string; context: string; sources: any[]; question?: string }>(key, 'json');

        if (data) {
          // Safety Guard: If incoming question and cached question have differing section/law numbers, bypass semantic cache!
          if (incomingQuestion && data.question && !doIdentifiersMatch(incomingQuestion, data.question)) {
            console.log(JSON.stringify({
              level: "INFO",
              label: "semantic_cache_bypassed_identifier_mismatch",
              incoming: incomingQuestion,
              cached: data.question,
              score: match.score,
            }));
            return { hit: false };
          }

          return {
            hit: true,
            answer: data.answer,
            score: match.score,
            latencyMs: performance.now() - start,
          };
        }
      }
    }
  } catch (error) {
    // Silently handle error
  }

  return { hit: false };
}

export async function saveSemanticCacheEntry(
  vectorizeCache: VectorizeIndex | undefined,
  kvCache: KVNamespace,
  queryHash: string,
  embedding: number[],
  payload: { answer: string; context: string; sources: any[]; tokensUsed?: number; question?: string },
  question?: string,
  datasetSignature?: string
): Promise<boolean> {
  if (!vectorizeCache || !embedding) {
    return false;
  }

  try {
    await vectorizeCache.insert([
      {
        id: queryHash,
        values: embedding,
        metadata: { queryHash },
      }
    ]);

    const key = datasetSignature ? `qcache:${datasetSignature}:${queryHash}` : `qcache:${queryHash}`;
    const fullPayload = { ...payload, question: question || payload.question };
    await kvCache.put(key, JSON.stringify(fullPayload), { expirationTtl: 86400 });

    return true;
  } catch (error) {
    return false;
  }
}

export async function purgeAllQueryCache(cache: KVNamespace): Promise<boolean> {
  try {
    let cursor: string | undefined = undefined;
    let complete = false;

    while (!complete) {
      const listOptions: any = { prefix: 'qcache:' };
      if (cursor) {
        listOptions.cursor = cursor;
      }
      const listResult: any = await cache.list(listOptions);
      const keys: string[] = (listResult?.keys || []).map((k: any) => k.name);

      for (const key of keys) {
        await cache.delete(key);
      }

      complete = listResult?.list_complete ?? true;
      cursor = listResult?.cursor;
      if (!cursor) break;
    }
    return true;
  } catch (error) {
    return false;
  }
}
