// src/v1/services/vector.service.ts
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { VectorizeIndex } from "@cloudflare/workers-types";
import { Document } from "@langchain/core/documents";
import { cloudflareVectorizeRestService, type VectorizeRestRecord } from "./cloudflare-vectorize-rest.service";

export type Chunk = {
  id: string;
  content: string;
  index: number;
  topic?: string;
  tags?: string[];
  section?: string;
  sectionNumber?: string | null;
  firstSentence?: string;
  values?: number[];
  metadata?: Record<string, any>;
};

export type VectorHit = {
  text: string;
  metadata: any;
  score01: number;   // 0..1 (best-effort)
  score100: number;  // 0..100
  rawScore: number;  // underlying score from store
};

export interface ByokVectorConfig {
  cfAccountId: string;
  cfApiToken: string;
  indexName?: string;
  datasetIndexMap?: {
    admin?: string;
    pdf?: string;
    web?: string;
    cache?: string;
  };
}

import { INGEST_CONFIG, RETRY_CONFIG } from "../constants";
import { sleep, backoff } from "../utils/retry";

const DEFAULT_UPSERT_BATCH_SIZE = INGEST_CONFIG.DEFAULT_VECTOR_UPSERT_BATCH_SIZE;
const MAX_UPSERT_BATCH_SIZE = 200;
const DEFAULT_RETRY_LIMIT = RETRY_CONFIG.DEFAULT_MAX_ATTEMPTS;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export type DatasetType = "admin" | "pdf" | "web";

export function getVectorIndexForDataset(env: any, dataset?: string): VectorizeIndex | undefined {
  const ds = (dataset || "admin").toLowerCase();
  if (ds === "pdf" && env?.VECTORIZE_PDF) return env.VECTORIZE_PDF;
  if (ds === "web" && env?.VECTORIZE_WEB) return env.VECTORIZE_WEB;
  if (ds === "admin" && env?.VECTORIZE_ADMIN) return env.VECTORIZE_ADMIN;
  return env?.VECTORIZE;
}

function buildDoc(c: Chunk): Document {
  const contentStr = String(c?.content || (c as any)?.pageContent || (c as any)?.text || "");
  const first_sentence =
    c?.firstSentence || (contentStr.split(/[.!?]/)[0] || "").slice(0, 200);

  const dataset = (c?.metadata as any)?.dataset || (c as any)?.dataset || "admin";

  return new Document({
    pageContent: contentStr,
    metadata: {
      chunk_id: c?.id || "",
      text: contentStr,
      topic: c?.topic || "general",
      section: c?.section || "",
      section_number: c?.sectionNumber ?? "",
      first_sentence,
      dataset,
      tags: Array.isArray(c?.tags) ? c.tags : [],
    },
  });
}

/**
 * NOTE about scoring:
 * LangChain's similaritySearchVectorWithScore returns a "score" whose semantics depend on the store.
 * For VectorizeStore, it is typically already similarity-like. We treat it as 0..1 if it looks like it.
 */
function normalizeScore01(raw: number): number {
  const v = Number(raw || 0);
  if (!Number.isFinite(v)) return 0;
  if (v >= 0 && v <= 1) return v;
  if (v > 1 && v <= 100) return v / 100;
  return clamp(v, 0, 1);
}

export const vectorService = {
  async storeChunks(
    chunks: Chunk[],
    apiKey: string,
    vectorIndex?: VectorizeIndex,
    opts?: { batchSize?: number; embeddingModel?: string; byokConfig?: ByokVectorConfig; dataset?: string }
  ): Promise<void> {
    if (!Array.isArray(chunks) || chunks.length === 0) return;

    const batchSize = Math.max(
      1,
      Math.min(opts?.batchSize ?? DEFAULT_UPSERT_BATCH_SIZE, MAX_UPSERT_BATCH_SIZE)
    );

    // 1. Check if client has dedicated Cloudflare Vectorize (REST Mode)
    if (opts?.byokConfig?.cfAccountId && opts?.byokConfig?.cfApiToken) {
      let indexName = opts.byokConfig.indexName;
      if (opts.byokConfig.datasetIndexMap && opts?.dataset) {
        const dsKey = opts.dataset.toLowerCase() as "admin" | "pdf" | "web";
        indexName = opts.byokConfig.datasetIndexMap[dsKey] || indexName;
      }
      if (!indexName) indexName = "chatbot-vector-index";

      console.log(`[VectorService] Routing vector upsert to Cloudflare Index [${indexName}] via REST API.`);

      // Ensure all chunks have embeddings
      const haveAllVectors = chunks.every((b) => Array.isArray(b.values) && (b.values?.length || 0) > 0);
      if (!haveAllVectors) {
        const embeddings = new OpenAIEmbeddings({ apiKey, model: opts?.embeddingModel });
        const textsToEmbed = chunks.map((c) => String(c.content || (c as any).text || ""));
        const computedVectors = await embeddings.embedDocuments(textsToEmbed);
        chunks.forEach((c, idx) => {
          c.values = computedVectors[idx];
        });
      }

      const restRecords: VectorizeRestRecord[] = chunks.map((c) => {
        const doc = buildDoc(c);
        return {
          id: c.id,
          values: c.values!,
          metadata: doc.metadata,
        };
      });

      await cloudflareVectorizeRestService.upsertVectors(
        opts.byokConfig.cfAccountId,
        opts.byokConfig.cfApiToken,
        indexName,
        restRecords,
        batchSize
      );
      return;
    }

    // 2. Standard Platform Native Worker Binding Mode
    if (!vectorIndex) {
      console.warn("Vectorize binding (c.env.VECTORIZE) is not active/bound in local dev mode — skipping Vectorize store.");
      return;
    }

    let vectorStore: any = null;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const docs = batch.map(buildDoc);
      const ids = batch.map((c) => c.id);

      const haveAllVectors = batch.every((b) => Array.isArray(b.values) && (b.values?.length || 0) > 0);

      let attempt = 0;
      for (;;) {
        try {
          attempt++;

          if (haveAllVectors) {
            const vectors = batch.map((b) => b.values!) as number[][];
            if (vectors.length !== docs.length || docs.length !== ids.length) {
              throw new Error(
                `vectorService.storeChunks: length mismatch (vectors=${vectors.length}, docs=${docs.length}, ids=${ids.length})`
              );
            }
            if (typeof (vectorIndex as any).upsert === "function") {
              const vectorizeRecords = batch.map((b, idx) => ({
                id: ids[idx],
                values: b.values!,
                metadata: docs[idx].metadata,
              }));
              await (vectorIndex as any).upsert(vectorizeRecords);
            } else {
              if (!vectorStore) {
                const embeddings = new OpenAIEmbeddings({ apiKey, model: opts?.embeddingModel });
                vectorStore = await CloudflareVectorizeStore.fromExistingIndex(embeddings, { index: vectorIndex });
              }
              await vectorStore.addVectors(vectors, docs, { ids });
            }
          } else {
            if (!vectorStore) {
              const embeddings = new OpenAIEmbeddings({ apiKey, model: opts?.embeddingModel });
              vectorStore = await CloudflareVectorizeStore.fromExistingIndex(embeddings, { index: vectorIndex });
            }
            if (typeof vectorStore.addDocuments === "function") {
              await vectorStore.addDocuments(docs, { ids });
            } else {
              await vectorStore.addDocuments(docs);
            }
          }

          break;
        } catch (err: any) {
          if (attempt >= DEFAULT_RETRY_LIMIT) {
            console.error(`vectorService.storeChunks failed after ${attempt} attempts:`, err?.message || err);
            throw err;
          }
          const delay = backoff(attempt);
          console.warn(`vectorService.storeChunks retry ${attempt} in ${delay}ms:`, err?.message || err);
          await sleep(delay);
        }
      }
    }
  },

  async searchChunks(
    embedding: number[],
    apiKey: string,
    vectorIndex?: VectorizeIndex,
    topK = 20,
    byokConfig?: ByokVectorConfig
  ): Promise<VectorHit[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("vectorService.searchChunks: invalid query embedding");
    }

    // 1. Check if client has dedicated Cloudflare Vectorize (REST Mode)
    if (byokConfig?.cfAccountId && byokConfig?.cfApiToken) {
      const indexName = byokConfig.indexName || "chatbot-vector-index";
      const matches = await cloudflareVectorizeRestService.queryVectors(
        byokConfig.cfAccountId,
        byokConfig.cfApiToken,
        indexName,
        embedding,
        topK
      );

      return matches.map((m) => {
        const score01 = normalizeScore01(Number(m.score || 0));
        const metadata = m.metadata || {};
        const text = metadata.text || metadata.content || metadata.pageContent || "";
        return {
          text,
          metadata,
          rawScore: Number(m.score || 0),
          score01,
          score100: Math.round(score01 * 100),
        };
      });
    }

    // 2. Standard Platform Native Worker Binding Mode
    if (!vectorIndex) {
      return [];
    }

    const embeddings = new OpenAIEmbeddings({ apiKey });
    const vectorStore = await CloudflareVectorizeStore.fromExistingIndex(embeddings, {
      index: vectorIndex,
    });

    const results = await vectorStore.similaritySearchVectorWithScore(embedding, topK);

    return results.map(([doc, rawScore]) => {
      const score01 = normalizeScore01(Number(rawScore || 0));
      return {
        text: doc.pageContent,
        metadata: doc.metadata,
        rawScore: Number(rawScore || 0),
        score01,
        score100: Math.round(score01 * 100),
      };
    });
  },

  async searchMultiIndex(
    embedding: number[],
    apiKey: string,
    env: any,
    activeDatasets: DatasetType[] = ["admin", "pdf", "web"],
    topKPerIndex = 15,
    byokConfig?: ByokVectorConfig
  ): Promise<VectorHit[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return [];
    }

    // 1. Dedicated / BYOK Mode: Query active dataset indexes via REST
    if (byokConfig?.cfAccountId && byokConfig?.cfApiToken) {
      const uniqueDatasets = Array.from(new Set(activeDatasets.filter(Boolean)));
      if (uniqueDatasets.length === 0) return [];

      const searchPromises = uniqueDatasets.map(async (ds) => {
        let indexName = byokConfig.indexName || "chatbot-vector-index";
        if (byokConfig.datasetIndexMap) {
          const dsKey = ds.toLowerCase() as "admin" | "pdf" | "web";
          if (byokConfig.datasetIndexMap[dsKey]) {
            indexName = byokConfig.datasetIndexMap[dsKey]!;
          }
        }

        try {
          const hits = await this.searchChunks(embedding, apiKey, undefined, topKPerIndex, {
            cfAccountId: byokConfig.cfAccountId,
            cfApiToken: byokConfig.cfApiToken,
            indexName,
          });
          return hits.map((h) => ({
            ...h,
            metadata: {
              ...(h.metadata || {}),
              dataset: ds,
            },
          }));
        } catch (err: any) {
          console.warn(`Vector search on index [${indexName}] for dataset [${ds}] warning:`, err?.message || err);
          return [];
        }
      });

      const resultsByDataset = await Promise.all(searchPromises);
      return resultsByDataset.flat();
    }

    // 2. Platform Mode: Query active dataset indexes in parallel with Promise.all
    const uniqueDatasets = Array.from(new Set(activeDatasets.filter(Boolean)));
    if (uniqueDatasets.length === 0) return [];

    const searchPromises = uniqueDatasets.map(async (ds) => {
      const idx = getVectorIndexForDataset(env, ds);
      if (!idx) return [];
      try {
        const hits = await this.searchChunks(embedding, apiKey, idx, topKPerIndex);
        return hits.map((h) => ({
          ...h,
          metadata: {
            ...(h.metadata || {}),
            dataset: ds,
          },
        }));
      } catch (err: any) {
        console.warn(`Vector search on index for dataset [${ds}] warning:`, err?.message || err);
        return [];
      }
    });

    const resultsByDataset = await Promise.all(searchPromises);
    return resultsByDataset.flat();
  },

  async deleteByIds(
    ids: string[],
    vectorIndex?: VectorizeIndex,
    opts?: { batchSize?: number; retryLimit?: number; byokConfig?: ByokVectorConfig }
  ): Promise<{ processed: number; deleted: number }> {
    if (!Array.isArray(ids) || ids.length === 0) return { processed: 0, deleted: 0 };

    // 1. Dedicated / BYOK Mode: Delete from Cloudflare Vectorize account via REST
    if (opts?.byokConfig?.cfAccountId && opts?.byokConfig?.cfApiToken) {
      const indexName = opts.byokConfig.indexName || "chatbot-vector-index";
      return await cloudflareVectorizeRestService.deleteVectors(
        opts.byokConfig.cfAccountId,
        opts.byokConfig.cfApiToken,
        indexName,
        ids,
        opts?.batchSize ?? 100
      );
    }

    // 2. Platform Mode: Delete from native worker binding
    if (!vectorIndex) return { processed: 0, deleted: 0 };

    const hardMax = 100;
    const batchSize = Math.max(1, Math.min(opts?.batchSize ?? hardMax, hardMax));
    const retryLimit = Math.max(1, Math.min(opts?.retryLimit ?? 3, 8));

    let deleted = 0;
    let processed = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      processed += batch.length;

      let attempt = 0;
      for (;;) {
        try {
          attempt++;
          const res: any = await (vectorIndex as any).deleteByIds(batch);

          const count =
            typeof res?.deleted === "number" ? res.deleted
            : typeof res?.count === "number" ? res.count
            : batch.length;

          deleted += count;
          break;
        } catch (err: any) {
          if (attempt >= retryLimit) throw err;
          const delay = 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return { processed, deleted };
  },
};
