// src/v1/services/cloudflare-vectorize-rest.service.ts
import { sleep, backoff } from "../utils/retry";

export interface VectorizeRestRecord {
  id: string;
  values: number[];
  namespace?: string;
  metadata?: Record<string, any>;
}

export interface VectorizeRestMatch {
  id: string;
  score: number;
  values?: number[];
  namespace?: string;
  metadata?: Record<string, any>;
}

export interface VectorizeRestQueryResult {
  matches: VectorizeRestMatch[];
  count: number;
}

export const cloudflareVectorizeRestService = {
  /**
   * Ensures the Vectorize index exists in the tenant's Cloudflare account.
   * If not found (404), it automatically creates the index.
   */
  async ensureIndexExists(
    accountId: string,
    apiToken: string,
    indexName: string,
    dimensions: number = 1536,
    metric: string = "cosine"
  ): Promise<boolean> {
    try {
      const checkUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}`;
      const checkRes = await fetch(checkUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      });

      if (checkRes.ok) {
        return true;
      }

      if (checkRes.status === 404) {
        console.log(`[VectorizeREST] Index '${indexName}' not found in account ${accountId}. Auto-creating index...`);
        const createUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes`;
        const createRes = await fetch(createUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: indexName,
            config: {
              dimensions,
              metric,
            },
            description: "Chatbot BYOK Vector Index",
          }),
        });

        if (createRes.ok) {
          console.log(`[VectorizeREST] Index '${indexName}' created successfully in account ${accountId}. Waiting for edge provisioning...`);
          for (let p = 0; p < 5; p++) {
            await sleep(2000);
            const verifyRes = await fetch(checkUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
            });
            if (verifyRes.ok) {
              console.log(`[VectorizeREST] Index '${indexName}' is verified ready in account ${accountId}.`);
              return true;
            }
          }
          return true;
        }

        const createErr = await createRes.text().catch(() => "");
        console.warn(`[VectorizeREST] Auto-create index '${indexName}' response (${createRes.status}): ${createErr}`);
      }
    } catch (e: any) {
      console.warn(`[VectorizeREST] ensureIndexExists warning:`, e?.message || e);
    }
    return false;
  },

  /**
   * Query a tenant's private Cloudflare Vectorize index via REST API.
   */
  async queryVectors(
    accountId: string,
    apiToken: string,
    indexName: string,
    vector: number[],
    topK: number = 20,
    filter?: Record<string, any>
  ): Promise<VectorizeRestMatch[]> {
    if (!accountId || !apiToken || !indexName) {
      throw new Error("Missing Cloudflare Account ID, API Token, or Index Name for BYOK Vectorize query.");
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/query`;

    const bodyPayload: any = {
      vector,
      topK,
      returnMetadata: "all",
      returnValues: false,
    };

    if (filter && Object.keys(filter).length > 0) {
      bodyPayload.filter = filter;
    }

    let attempt = 0;
    const maxAttempts = 3;

    for (;;) {
      try {
        attempt++;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        });

        if (res.status === 404) {
          console.warn(`[VectorizeREST] Index '${indexName}' does not exist yet on account ${accountId}. Returning 0 matches.`);
          return [];
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Cloudflare Vectorize Query API Error (${res.status}): ${errText}`);
        }

        const data: any = await res.json();
        if (!data.success && data.errors && data.errors.length > 0) {
          throw new Error(`Vectorize API Error: ${data.errors.map((e: any) => e.message).join(", ")}`);
        }

        const matches = data?.result?.matches || [];
        return matches as VectorizeRestMatch[];
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          console.error(`[VectorizeREST] queryVectors failed after ${attempt} attempts:`, err?.message || err);
          throw err;
        }
        const delay = backoff(attempt);
        await sleep(delay);
      }
    }
  },

  /**
   * Upsert vector records into a tenant's private Cloudflare Vectorize index via REST API.
   */
  async upsertVectors(
    accountId: string,
    apiToken: string,
    indexName: string,
    records: VectorizeRestRecord[],
    batchSize: number = 100
  ): Promise<{ count: number; mutationId?: string }> {
    if (!accountId || !apiToken || !indexName) {
      throw new Error("Missing Cloudflare Account ID, API Token, or Index Name for BYOK Vectorize upsert.");
    }
    if (!Array.isArray(records) || records.length === 0) {
      return { count: 0 };
    }

    // Auto-create index if it does not exist
    await this.ensureIndexExists(accountId, apiToken, indexName);

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/insert`;
    let totalInserted = 0;
    let lastMutationId: string | undefined;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      // Format as NDJSON (Newline Delimited JSON)
      const ndjsonBody = batch.map((r) => JSON.stringify(r)).join("\n");

      let attempt = 0;
      const maxAttempts = 3;

      for (;;) {
        try {
          attempt++;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/x-ndjson",
            },
            body: ndjsonBody,
          });

          if (res.status === 404 && attempt <= 2) {
            console.log(`[VectorizeREST] Received 404 during insert. Retrying index creation...`);
            await this.ensureIndexExists(accountId, apiToken, indexName);
            await sleep(2000);
            continue;
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare Vectorize Insert API Error (${res.status}): ${errText}`);
          }

          const data: any = await res.json();
          if (!data.success && data.errors && data.errors.length > 0) {
            throw new Error(`Vectorize Insert Error: ${data.errors.map((e: any) => e.message).join(", ")}`);
          }

          totalInserted += data?.result?.count || batch.length;
          lastMutationId = data?.result?.mutationId;
          break;
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[VectorizeREST] upsertVectors failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    }

    return { count: totalInserted, mutationId: lastMutationId };
  },

  /**
   * Delete vector records by ID from a tenant's private Cloudflare Vectorize index via REST API.
   */
  async deleteVectors(
    accountId: string,
    apiToken: string,
    indexName: string,
    ids: string[],
    batchSize: number = 100
  ): Promise<{ processed: number; deleted: number }> {
    if (!accountId || !apiToken || !indexName) {
      throw new Error("Missing Cloudflare Account ID, API Token, or Index Name for BYOK Vectorize deletion.");
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return { processed: 0, deleted: 0 };
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${indexName}/delete_by_ids`;
    let processed = 0;
    let deleted = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      processed += batch.length;

      let attempt = 0;
      const maxAttempts = 3;

      for (;;) {
        try {
          attempt++;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: batch }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Cloudflare Vectorize Delete API Error (${res.status}): ${errText}`);
          }

          const data: any = await res.json();
          if (!data.success && data.errors && data.errors.length > 0) {
            throw new Error(`Vectorize Delete Error: ${data.errors.map((e: any) => e.message).join(", ")}`);
          }

          deleted += data?.result?.count || batch.length;
          break;
        } catch (err: any) {
          if (attempt >= maxAttempts) {
            console.error(`[VectorizeREST] deleteVectors failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          await sleep(delay);
        }
      }
    }

    return { processed, deleted };
  },
};
