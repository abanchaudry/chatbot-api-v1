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
  question: string
): Promise<CachedQueryResponse | null> {
  const start = performance.now();
  const normalized = normalizeQuery(question);

  if (normalized.length <= 3) {
    return null;
  }

  try {
    const hash = await generateSha256Hash(normalized);
    const key = `qcache:${hash}`;
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

export async function saveQueryResponseToCache(
  cache: KVNamespace,
  question: string,
  payload: { answer: string; context: string; sources: any[]; tokensUsed?: number }
): Promise<boolean> {
  const normalized = normalizeQuery(question);

  if (normalized.length <= 3) {
    return false;
  }

  try {
    const hash = await generateSha256Hash(normalized);
    const key = `qcache:${hash}`;
    await cache.put(key, JSON.stringify(payload), { expirationTtl: 86400 });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getSemanticCacheHit(
  vectorizeCache: VectorizeIndex | undefined,
  embedding: number[] | null,
  kvCache: KVNamespace
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
        const key = `qcache:${queryHash}`;
        const data = await kvCache.get<{ answer: string; context: string; sources: any[] }>(key, 'json');

        if (data) {
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
  payload: { answer: string; context: string; sources: any[]; tokensUsed?: number }
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

    const key = `qcache:${queryHash}`;
    await kvCache.put(key, JSON.stringify(payload), { expirationTtl: 86400 });

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
      const listResult: any = await cache.list({ prefix: 'qcache:', cursor });
      const keys: string[] = listResult.keys.map((k: any) => k.name);

      for (const key of keys) {
        await cache.delete(key);
      }

      complete = listResult.list_complete;
      cursor = listResult.cursor;
    }
    return true;
  } catch (error) {
    return false;
  }
}
