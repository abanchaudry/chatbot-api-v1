// src/v1/controllers/crawler.controller.ts

import type { Context } from "hono";
import { nanoid } from "nanoid";
import { crawlWebPage, discoverLinks, DiscoveredPage } from "../services/crawler.service";
import { fileDb } from "../services/db/files.db";
import { vectorService, getVectorIndexForDataset } from "../services/vector.service";
import { EmbeddingService } from "../services/embedding.service";
import { getOpenAIKey } from "../utils/keys";
import { purgeAllQueryCache } from "../services/cache.service";
import { ScalableRagClient } from "../services/ingestion/scalable-rag.client";
import { CRAWLER_CONFIG } from "../constants";

/**
 * Shared helper to crawl a single page, convert to Markdown, generate 3-tier chunks,
 * store in D1 and upsert into Vectorize.
 */
async function crawlAndIndexUrl(
  env: any,
  targetUrl: string,
  client: ScalableRagClient,
  openAiKey: string | null,
  clientId: string = "default",
  byokConfig?: { cfAccountId: string; cfApiToken: string; indexName?: string }
): Promise<{
  url: string;
  fileId: string;
  fileName: string;
  chunks: number;
  vectors: number;
}> {
  const crawlResult = await crawlWebPage(env, targetUrl);

  const fileName = crawlResult.title || targetUrl.replace(/^https?:\/\//, "");
  const fileId = `web_${nanoid(12)}`;
  const markdownText = crawlResult.markdown;

  // 1. Create File Record in D1 SQLite
  await fileDb.saveFile(
    env.DB,
    fileName,
    markdownText.length,
    "processing",
    fileId,
    targetUrl,
    "web",
    clientId
  );

  // 2. Process Markdown into 3-Tier Agentic AI Chunks via Scalable RAG
  const mockBlob = new Blob([markdownText], { type: "text/plain" });

  let ferventChunks: any[] = [];
  try {
    let scalableResult: any;
    try {
      scalableResult = await client.processDocument(mockBlob, "offline", "ai", undefined, `${fileName}.txt`);
    } catch (procErr: any) {
      console.warn(`[Crawler] Scalable RAG error for ${targetUrl}, fallback to adaptive:`, procErr?.message);
      scalableResult = await client.processDocument(mockBlob, "offline", "adaptive", undefined, `${fileName}.txt`);
    }
    if (scalableResult) {
      ferventChunks = ScalableRagClient.toFerventCurieChunks(scalableResult);
    }
  } catch (err: any) {
    console.warn(`[Crawler] Scalable RAG failed for ${targetUrl}:`, err?.message);
  }

  // Fallback to local chunking if Scalable RAG returned no chunks
  if (!ferventChunks || ferventChunks.length === 0) {
    console.log(`[Crawler] Using fallback chunking for ${targetUrl}`);
    try {
      if (openAiKey) {
        const { ChunkingServiceV2 } = await import("../services/chunkingv2.service");
        const res = await new ChunkingServiceV2(openAiKey, { cacheKV: env.CACHE }).process(markdownText, fileName, "v1", true);
        ferventChunks = (res.chunks || []).map((c: any) => ({
          section: c.section || "Web Ingestion",
          content: c.content,
          topic: c.topic || "Web Ingestion",
          tags: c.tags || [],
          tier: "small",
          parentId: null,
        }));
      }
    } catch (fallbackErr: any) {
      console.warn(`[Crawler] ChunkingServiceV2 fallback failed:`, fallbackErr?.message);
    }
  }

  // Final deterministic fallback if still empty:
  if (!ferventChunks || ferventChunks.length === 0) {
    ferventChunks = [
      {
        section: "Page Content",
        content: markdownText.slice(0, 1500),
        topic: "Web Page Overview",
        tags: ["web"],
        tier: "small",
        parentId: null,
      },
    ];
  }

  // 3. Format Chunks for D1 & Vectorize
  const formattedChunks = ferventChunks.map((chunk, index) => {
    const chunkId = `web_${nanoid(16)}`;
    return {
      chunk_id: chunkId,
      chunk_index: index,
      section: chunk.section || "Web Page",
      content: chunk.content,
      topic: chunk.topic || "General Web",
      tags: chunk.tags || [],
      tier: chunk.tier || "small",
      parent_id: chunk.parentId || null,
      char_count: chunk.content.length,
      token_count: Math.ceil(chunk.content.length / 4),
    };
  });

  // 4. Save Chunks into D1 SQLite
  await chunkDb.saveChunks(
    env.DB,
    fileId,
    formattedChunks.map(c => ({
      chunk_id: c.chunk_id,
      chunk_index: c.chunk_index,
      section: c.section,
      content: c.content,
      topic: c.topic,
      tags: c.tags,
      tier: c.tier,
      parent_id: c.parent_id,
      char_count: c.char_count,
      token_count: c.token_count,
    })),
    "web",
    clientId
  );

  // 5. Update File Status to Completed in D1
  await fileDb.updateFile(env.DB, fileId, {
    file_status: "completed",
    chunk_count: formattedChunks.length,
  });

  // 6. Generate Embeddings & Upsert into Vectorize (web dataset)
  let vectorsUpserted = 0;
  const webVectorIndex = getVectorIndexForDataset(env, "web");

  if (openAiKey && (webVectorIndex || byokConfig)) {
    try {
      const chunkToEmbed = formattedChunks.filter(ch => ch.tier === "small");
      const textsToEmbed = chunkToEmbed.map(ch => `${ch.section ? `[${ch.section}] ` : ""}${ch.content}`);
      const embeddings = await EmbeddingService.generate(textsToEmbed, openAiKey);

      await vectorService.storeChunks(
        chunkToEmbed.map((ch, idx) => ({
          id: ch.chunk_id,
          content: ch.content,
          index: ch.chunk_index,
          topic: ch.topic,
          tags: ch.tags,
          section: ch.section,
          values: embeddings[idx],
          metadata: {
            chunk_id: ch.chunk_id,
            file_id: fileId,
            file_name: fileName,
            section_title: ch.section,
            topic: ch.topic,
            dataset: "web",
            source_type: "web",
            url: targetUrl,
            client_id: clientId,
          },
        })),
        openAiKey,
        webVectorIndex,
        { byokConfig }
      );
      vectorsUpserted = chunkToEmbed.length;
    } catch (vErr: any) {
      console.warn(`[Crawler] Vectorize upsert warning for ${targetUrl}:`, vErr?.message);
    }
  }

  return {
    url: targetUrl,
    fileId,
    fileName,
    chunks: formattedChunks.length,
    vectors: vectorsUpserted,
  };
}

export const CrawlerController = {
  /**
   * CRAWL & INDEX WEB URL
   * POST /api/crawler/crawl
   * Body: { url: string, crawlSchedule?: string }
   */
  crawl: async (c: Context) => {
    try {
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json(
          { ok: false, message: "Web Crawler feature is disabled in wrangler.toml" },
          403
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const rawUrl = String(body.url || "").trim();
      const crawlSchedule = String(body.crawlSchedule || "manual").toLowerCase();
      const clientId = (c as any).get("clientId") || "default";

      if (!rawUrl) {
        return c.json({ ok: false, message: "URL is required" }, 400);
      }

      let targetUrl = rawUrl;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }

      const openAiKey = getOpenAIKey(c.env);
      const scalableTarget = (c.env as any).SCALABLE_RAG || c.env.SCALABLE_RAG_URL || "https://scalable-rag.hassanwaqar475.workers.dev";
      const client = new ScalableRagClient(scalableTarget);

      let byokConfig: any = undefined;
      let effectiveKey = openAiKey;
      try {
        const { tenantService } = await import("../services/tenant.service");
        const tenantCtx = await tenantService.resolveContext(c);
        if (tenantCtx.openaiApiKey) effectiveKey = tenantCtx.openaiApiKey;
        if (tenantCtx.isByok && tenantCtx.cfAccountId && tenantCtx.cfApiToken) {
          byokConfig = {
            cfAccountId: tenantCtx.cfAccountId,
            cfApiToken: tenantCtx.cfApiToken,
            indexName: "chatbot-vector-index",
          };
        }
      } catch {}

      console.log(`[Crawler] Starting crawl for: ${targetUrl} (Schedule: ${crawlSchedule}, Tenant: ${clientId})`);
      const result = await crawlAndIndexUrl(c.env, targetUrl, client, effectiveKey, clientId, byokConfig);

      if (c.env.CACHE) {
        try {
          await purgeAllQueryCache(c.env.CACHE);
        } catch (purgeErr: any) {
          console.warn("[Crawler] Cache purge error:", purgeErr?.message);
        }
      }

      return c.json({
        ok: true,
        message: "Web page crawled and indexed successfully",
        fileId: result.fileId,
        fileName: result.fileName,
        url: result.url,
        chunks: result.chunks,
        vectors: result.vectors,
      });
    } catch (err: any) {
      console.error("[Crawler] Crawl failed:", err?.message || err);
      return c.json(
        { ok: false, message: "Crawler failed", error: err?.message || String(err) },
        500
      );
    }
  },

  /**
   * DISCOVER SITEMAP LINKS
   * POST /api/crawler/discover
   * Body: { url: string, maxDepth?: number, maxPages?: number }
   */
  discover: async (c: Context) => {
    try {
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json(
          { ok: false, message: "Web Crawler feature is disabled in wrangler.toml" },
          403
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const rawUrl = String(body.url || "").trim();
      const maxDepth = Number(body.maxDepth ?? 2);
      const maxPages = Math.min(Math.max(Number(body.maxPages ?? 200), 1), 200);

      if (!rawUrl) {
        return c.json({ ok: false, message: "URL is required" }, 400);
      }

      let targetUrl = rawUrl;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }

      const startTime = performance.now();
      const pages: DiscoveredPage[] = await discoverLinks(c.env, targetUrl, maxDepth, maxPages);
      const durationMs = Math.round(performance.now() - startTime);

      return c.json({
        ok: true,
        rootUrl: targetUrl,
        totalFound: pages.length,
        durationMs,
        pages,
      });
    } catch (err: any) {
      console.error("[Crawler] Discover failed:", err?.message || err);
      return c.json(
        { ok: false, message: "Discover failed", error: err?.message || String(err) },
        500
      );
    }
  },

  /**
   * CRAWL SELECTED PAGES
   * POST /api/crawler/crawl-selected
   * Body: { pages: string[] }
   */
  crawlSelected: async (c: Context) => {
    try {
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json({ ok: false, message: "Web Crawler feature is disabled in wrangler.toml" }, 403);
      }

      const body = await c.req.json().catch(() => ({}));
      const pages = Array.isArray(body.pages) ? body.pages : [];

      if (pages.length === 0) {
        return c.json({ ok: false, message: "pages array is required and must not be empty" }, 400);
      }

      const results: any[] = [];
      let totalChunks = 0;
      let totalVectors = 0;
      let crawled = 0;

      const openAiKey = getOpenAIKey(c.env);
      const scalableTarget = (c.env as any).SCALABLE_RAG || c.env.SCALABLE_RAG_URL || "https://scalable-rag.hassanwaqar475.workers.dev";
      const client = new ScalableRagClient(scalableTarget);
      const clientId = (c as any).get("clientId") || "default";

      let byokConfig: any = undefined;
      let effectiveKey = openAiKey;
      try {
        const { tenantService } = await import("../services/tenant.service");
        const tenantCtx = await tenantService.resolveContext(c);
        if (tenantCtx.openaiApiKey) effectiveKey = tenantCtx.openaiApiKey;
        if (tenantCtx.isByok && tenantCtx.cfAccountId && tenantCtx.cfApiToken) {
          byokConfig = {
            cfAccountId: tenantCtx.cfAccountId,
            cfApiToken: tenantCtx.cfApiToken,
            indexName: "chatbot-vector-index",
          };
        }
      } catch {}

      const batchSize = CRAWLER_CONFIG.CONCURRENT_CRAWL_BATCH_SIZE;
      for (let i = 0; i < pages.length; i += batchSize) {
        const pageBatch = pages.slice(i, i + batchSize);
        await Promise.all(
          pageBatch.map(async (pageUrl: any) => {
            try {
              const targetUrl = String(pageUrl).trim();
              if (!targetUrl) return;

              const res = await crawlAndIndexUrl(c.env, targetUrl, client, effectiveKey, clientId, byokConfig);
              crawled++;
              totalChunks += res.chunks;
              totalVectors += res.vectors;
              results.push(res);
            } catch (pageErr: any) {
              console.error(`[Crawler] Failed to process page ${pageUrl}:`, pageErr?.message);
              results.push({
                url: pageUrl,
                error: pageErr?.message || "Failed to crawl page",
              });
            }
          })
        );
      }

      if (c.env.CACHE) {
        try {
          await purgeAllQueryCache(c.env.CACHE);
        } catch (purgeErr: any) {
          console.warn("[Crawler] Cache purge error:", purgeErr?.message);
        }
      }

      return c.json({
        ok: true,
        crawled,
        results,
        totalChunks,
        totalVectors,
      });
    } catch (err: any) {
      console.error("[Crawler] crawlSelected failed:", err?.message || err);
      return c.json({ ok: false, message: err?.message || "Crawl selected failed" }, 500);
    }
  },
};
