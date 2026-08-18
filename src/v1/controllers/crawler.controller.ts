// src/v1/controllers/crawler.controller.ts

import type { Context } from "hono";
import { nanoid } from "nanoid";
import { crawlWebPage, discoverLinks, DiscoveredPage } from "../services/crawler.service";
import { fileDb } from "../services/db/files.db";
import { vectorService } from "../services/vector.service";
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
  openAiKey: string | null
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
    targetUrl
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
    const paragraphs = markdownText.split(/\n\n+/).filter((p: string) => p.trim().length > 30);
    const parts = paragraphs.length > 0 ? paragraphs : [markdownText];
    ferventChunks = parts.map((p: string, i: number) => ({
      section: `Page Content Part ${i + 1}`,
      content: p.trim(),
      topic: "Web Ingestion",
      tags: ["web-crawl"],
      tier: "small",
      parentId: null,
    }));
  }

  // 3. Format Chunks
  const formattedChunks = ferventChunks.map((ch, idx) => ({
    chunk_id: `chk_${nanoid(12)}`,
    file_id: fileId,
    section: ch.section || "Web Content",
    section_number: null,
    topic: ch.topic || "Web Ingestion",
    first_sentence: (ch.content || "").slice(0, 100).replace(/\n/g, " "),
    content: ch.content || "",
    tags: Array.isArray(ch.tags) ? ch.tags : [],
    chunk_index: idx,
    tier: ch.tier || "small",
    parentId: ch.parentId || null,
  }));

  // 4. Save to `chunks` table
  await fileDb.saveChunksBatch(env.DB, {
    fileId: fileId,
    fileName: fileName,
    version: "v1",
    chunks: formattedChunks.map((ch) => ({
      index: ch.chunk_index,
      content: ch.content,
      section: ch.section,
      tags: ch.tags,
      topic: ch.topic,
      tier: ch.tier,
      parentId: ch.parentId,
    })),
    embeddingModel: "text-embedding-3-small",
    chunkMethod: "ai",
    source: "admin",
  });

  // 5. Save to `document_chunks` table
  for (const ch of formattedChunks) {
    try {
      await env.DB.prepare(
        `INSERT INTO document_chunks (id, document_id, tier, content, category, parent_id, token_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        ch.chunk_id,
        fileId,
        ch.tier || "small",
        ch.content,
        ch.topic,
        ch.parentId || null,
        Math.ceil(ch.content.length / 4),
        new Date().toISOString()
      ).run();
    } catch (insertErr: any) {
      console.warn("[Crawler] document_chunks insert warning:", insertErr?.message);
    }
  }

  await fileDb.updateFileStatus(env.DB, fileId, "completed", formattedChunks.length);

  // 6. Vector Embeddings
  let vectorsUpserted = 0;

  if (openAiKey && env.VECTORIZE) {
    try {
      const detailChunks = formattedChunks.filter(c => c.tier === "small" || !c.tier);
      const chunkToEmbed = detailChunks.length > 0 ? detailChunks : formattedChunks;

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
            source_type: "web",
            url: targetUrl,
          },
        })),
        openAiKey,
        env.VECTORIZE
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

      console.log(`[Crawler] Starting crawl for: ${targetUrl} (Schedule: ${crawlSchedule})`);
      const result = await crawlAndIndexUrl(c.env, targetUrl, client, openAiKey);

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
      const maxDepth = Number(body.maxDepth ?? 1);
      const maxPages = Number(body.maxPages ?? 40);

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

      const batchSize = CRAWLER_CONFIG.CONCURRENT_CRAWL_BATCH_SIZE;
      for (let i = 0; i < pages.length; i += batchSize) {
        const pageBatch = pages.slice(i, i + batchSize);
        await Promise.all(
          pageBatch.map(async (pageUrl: any) => {
            try {
              const targetUrl = String(pageUrl).trim();
              if (!targetUrl) return;

              const res = await crawlAndIndexUrl(c.env, targetUrl, client, openAiKey);
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
