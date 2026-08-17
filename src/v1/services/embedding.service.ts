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
    const embedder = new OpenAIEmbeddings({ apiKey, model: opts.model });
    const out: number[][] = [];

    for (let i = 0; i < clean.length; i += opts.batchSize) {
      const batch = clean.slice(i, i + opts.batchSize);

      let attempt = 0;
      // retry loop per batch
      for (;;) {
        try {
          attempt++;
          // LangChain’s embedDocuments preserves order
          const vectors = await embedder.embedDocuments(batch);
          out.push(...vectors);
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
