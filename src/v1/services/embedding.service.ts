// File: src/v1/services/embedding.service.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { progressTracker } from "../utils/progress-tracker";
import { INGEST_CONFIG } from "../constants";
import { sleep, backoff } from "../utils/retry";

type GenOpts = {
  model?: string;          // default: "text-embedding-3-small"
  batchSize?: number;      // default: 50
  maxRetries?: number;     // default: 3
};

const DEFAULTS: Required<GenOpts> = {
  model: "text-embedding-3-small",
  batchSize: INGEST_CONFIG.DEFAULT_EMBEDDING_BATCH_SIZE,
  maxRetries: 3,
};

function sanitizeTexts(texts: string[]) {
  // Ensure every input is a non-empty string; preserve order/length.
  // Replace empty/whitespace-only with a single period to avoid API errors.
  const out = texts.map((t) => {
    const s = (t ?? "").toString();
    return s.trim().length ? s : ".";
  });
  return out;
}

export const EmbeddingService = {
  /** Single search/query embedding */
  async getEmbedding(query: string, apiKey: string, model = DEFAULTS.model): Promise<number[]> {
    const embedder = new OpenAIEmbeddings({ apiKey, model });
    return await embedder.embedQuery((query ?? "").toString() || ".");
  },

  /** Batch embeddings for chunk arrays with retries + batching (order preserved) */
  async generate(
    texts: string[],
    apiKey: string,
    uploadId?: string,
    modelOrOpts?: string | GenOpts
  ): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) return [];

    const opts: Required<GenOpts> =
      typeof modelOrOpts === "string"
        ? { ...DEFAULTS, model: modelOrOpts }
        : { ...DEFAULTS, ...(modelOrOpts || {}) };

    if (uploadId) {
      progressTracker.step(uploadId, `Generating embeddings for ${texts.length} chunks`);
    }

    const clean = sanitizeTexts(texts);
    const out: number[][] = [];
    const batchSize = Math.max(1, Math.min(opts.batchSize || 100, 200));

    for (let i = 0; i < clean.length; i += batchSize) {
      const batch = clean.slice(i, i + batchSize);

      let attempt = 0;
      // retry loop per batch
      for (;;) {
        try {
          attempt++;
          const res = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: opts.model,
              input: batch,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = (errData as any)?.error?.message || `HTTP ${res.status} ${res.statusText}`;
            throw new Error(errMsg);
          }

          const data: any = await res.json();
          const batchVectors = (data.data || []).sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
          out.push(...batchVectors);
          break;
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (attempt >= opts.maxRetries) {
            console.error(
              `embeddings.batch failed i=${i} size=${batch.length} attempts=${attempt} error=${msg}`
            );
            throw err;
          }
          const wait = backoff(attempt);
          console.warn(
            `embeddings.retry i=${i} size=${batch.length} attempt=${attempt} waitMs=${wait} error=${msg}`
          );
          await sleep(wait);
        }
      }
    }

    // Sanity check: preserve 1:1 alignment
    if (out.length !== texts.length) {
      console.error(
        `embeddings.mismatch expected=${texts.length} got=${out.length}`
      );
      throw new Error("Embedding count mismatch");
    }

    return out;
  },
};
