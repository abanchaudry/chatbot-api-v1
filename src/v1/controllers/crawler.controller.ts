// src/v1/controllers/crawler.controller.ts

import type { Context } from "hono";
import { nanoid } from "nanoid";
import { crawlWebPage, discoverLinks, DiscoveredPage } from "../services/crawler.service";
import { fileDb } from "../services/db/files.db";
import { chunkDb } from "../services/db/chunk.db";
import { vectorService } from "../services/vector.service";
import { EmbeddingService } from "../services/embedding.service";
import { getOpenAIKey } from "../utils/keys";
import { purgeAllQueryCache } from "../services/cache.service";
import { ScalableRagClient } from "../services/ingestion/scalable-rag.client";

export const CrawlerController = {
  /**
   * CRAWL & INDEX WEB URL
   * POST /api/crawler/crawl
   * Body: { url: string, category?: string }
   */
  crawl: async (c: Context) => {
    try {
      // 1. Check feature flag in wrangler.toml
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json(
          { ok: false, message: "Web Crawler feature is disabled in wrangler.toml" },
          403
        );
      }

      // 2. Auth check (requires admin key)
      const adminKey = c.req.header("x-api-key") || c.req.header("x-admin-key");
      const expectedKey = c.env.ADMIN_API_KEY || (c.env.CONFIG ? await c.env.CONFIG.get("ADMIN_API_KEY") : null);
      if (!adminKey || (expectedKey && adminKey !== expectedKey)) {
        return c.json({ ok: false, message: "Unauthorized: Invalid admin key" }, 401);
      }

      // 3. Parse request body
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

      let nextCrawlAt: string | null = null;
      const now = new Date();
      if (crawlSchedule === "daily") {
        now.setDate(now.getDate() + 1);
        nextCrawlAt = now.toISOString();
      } else if (crawlSchedule === "weekly") {
        now.setDate(now.getDate() + 7);
        nextCrawlAt = now.toISOString();
      } else if (crawlSchedule === "monthly") {
        now.setDate(now.getDate() + 30);
        nextCrawlAt = now.toISOString();
      }

      // 4. Crawl Web Page via Cloudflare Browser Run or Edge Fetch
      console.log(`[Crawler] Starting crawl for: ${targetUrl} (Schedule: ${crawlSchedule})`);
      const crawlResult = await crawlWebPage(c.env, targetUrl);

      const fileName = crawlResult.title || targetUrl.replace(/^https?:\/\//, "");
      const fileId = `web_${nanoid(12)}`;
      const markdownText = crawlResult.markdown;

      // 5. Create File Record in D1 SQLite
      await fileDb.saveFile(
        c.env.DB,
        fileName,
        markdownText.length,
        "processing",
        fileId,
        targetUrl
      );

      // 6. Process Markdown into 3-Tier Agentic AI Chunks via Scalable RAG
      const client = new ScalableRagClient();
      const mockBlob = new Blob([markdownText], { type: "text/plain" });

      let scalableResult: any;
      try {
        scalableResult = await client.processDocument(mockBlob, "offline", "ai", undefined, `${fileName}.txt`);
      } catch (procErr: any) {
        console.warn("[Crawler] Scalable RAG process error, fallback to adaptive:", procErr.message);
        scalableResult = await client.processDocument(mockBlob, "offline", "adaptive", undefined, `${fileName}.txt`);
      }

      const ferventChunks = ScalableRagClient.toFerventCurieChunks(scalableResult);

      // 7. Save Chunks into D1 SQLite `chunks` and `document_chunks`
      const formattedChunks = ferventChunks.map((ch, idx) => ({
        chunk_id: `chk_${nanoid(12)}`,
        file_id: fileId,
        section: ch.section,
        section_number: null,
        topic: ch.topic || "Web Ingestion",
        first_sentence: ch.content.slice(0, 100).replace(/\n/g, " "),
        content: ch.content,
        tags: ch.tags,
        chunk_index: idx,
        tier: ch.tier,
        parentId: ch.parentId,
      }));

      // 7. Save 3-Tier Chunks into D1 SQLite `chunks` and `document_chunks`
      await fileDb.saveChunksBatch(c.env.DB, {
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
        source: "web",
      });

      // Also insert into document_chunks for 3-tier linked editor lookup
      for (const ch of formattedChunks) {
        try {
          await c.env.DB.prepare(
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
        } catch {}
      }

      // Update file status to completed
      await fileDb.updateFileStatus(c.env.DB, fileId, "completed", formattedChunks.length);

      // 8. Generate 1536d OpenAI Vector Embeddings and Upsert to Cloudflare Vectorize
      let vectorsUpserted = 0;
      const openAiKey = getOpenAIKey(c.env);

      if (openAiKey && c.env.VECTORIZE) {
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
            c.env.VECTORIZE
          );
          vectorsUpserted = chunkToEmbed.length;
        } catch (vErr: any) {
          console.warn("[Crawler] Vectorize upsert warning (non-blocking):", vErr.message);
        }
      }

      // 9. Auto-Purge Query Cache so fresh web data is immediately active
      if (c.env.CACHE) {
        try { await purgeAllQueryCache(c.env.CACHE); } catch {}
      }

      return c.json({
        ok: true,
        message: "Web page crawled and indexed successfully",
        fileId,
        fileName,
        targetUrl,
        crawlSchedule,
        nextCrawlAt,
        crawlMethod: crawlResult.method,
        chunkCounts: scalableResult?.counts || { total: formattedChunks.length },
        vectorsUpserted,
      });
    } catch (err: any) {
      const errMsg = err?.stack || err?.message || String(err);
      console.error("[Crawler] Crawl failed:", errMsg);
      return c.json({ ok: false, message: err?.message || "Crawl failed", error: errMsg }, 500);
    }
  },

  /**
   * DISCOVER LINKS
   * POST /api/crawler/discover
   */
  discover: async (c: Context) => {
    try {
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json({ ok: false, message: "Web Crawler feature is disabled in wrangler.toml" }, 403);
      }

      const adminKey = c.req.header("x-api-key") || c.req.header("x-admin-key");
      const expectedKey = c.env.ADMIN_API_KEY || (c.env.CONFIG ? await c.env.CONFIG.get("ADMIN_API_KEY") : null);
      if (!adminKey || (expectedKey && adminKey !== expectedKey)) {
        return c.json({ ok: false, message: "Unauthorized: Invalid admin key" }, 401);
      }

      const body = await c.req.json().catch(() => ({}));
      const rawUrl = String(body.url || "").trim();
      
      if (!rawUrl) {
        return c.json({ ok: false, message: "URL is required" }, 400);
      }

      let targetUrl = rawUrl;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }

      const maxDepth = body.maxDepth !== undefined ? Number(body.maxDepth) : 2;
      const maxPages = body.maxPages !== undefined ? Number(body.maxPages) : 50;

      const pages = await discoverLinks(c.env, targetUrl, maxDepth, maxPages);

      return c.json({
        ok: true,
        rootUrl: targetUrl,
        pages,
        totalDiscovered: pages.length
      });
    } catch (err: any) {
      return c.json({ ok: false, message: err?.message || "Discover failed" }, 500);
    }
  },

  /**
   * CRAWL SELECTED
   * POST /api/crawler/crawl-selected
   */
  crawlSelected: async (c: Context) => {
    try {
      if (String(c.env.ENABLE_WEB_CRAWLER || "true") === "false") {
        return c.json({ ok: false, message: "Web Crawler feature is disabled in wrangler.toml" }, 403);
      }

      const adminKey = c.req.header("x-api-key") || c.req.header("x-admin-key");
      const expectedKey = c.env.ADMIN_API_KEY || (c.env.CONFIG ? await c.env.CONFIG.get("ADMIN_API_KEY") : null);
      if (!adminKey || (expectedKey && adminKey !== expectedKey)) {
        return c.json({ ok: false, message: "Unauthorized: Invalid admin key" }, 401);
      }

      const body = await c.req.json().catch(() => ({}));
      const pages = Array.isArray(body.pages) ? body.pages : [];
      
      if (pages.length === 0) {
        return c.json({ ok: false, message: "pages array is required and must not be empty" }, 400);
      }

      const results = [];
      let totalChunks = 0;
      let totalVectors = 0;
      let crawled = 0;

      const openAiKey = getOpenAIKey(c.env);
      const client = new ScalableRagClient();

      const batchSize = 5;
      for (let i = 0; i < pages.length; i += batchSize) {
        const pageBatch = pages.slice(i, i + batchSize);
        await Promise.all(
          pageBatch.map(async (pageUrl) => {
            try {
              const targetUrl = String(pageUrl).trim();
              if (!targetUrl) return;
              
              const crawlResult = await crawlWebPage(c.env, targetUrl);

              const fileName = crawlResult.title || targetUrl.replace(/^https?:\/\//, "");
              const fileId = `web_${nanoid(12)}`;
              const markdownText = crawlResult.markdown;

              await fileDb.saveFile(
                c.env.DB,
                fileName,
                markdownText.length,
                "processing",
                fileId,
                targetUrl
              );

              const mockBlob = new Blob([markdownText], { type: "text/plain" });

              let scalableResult: any;
              try {
                scalableResult = await client.processDocument(mockBlob, "offline", "ai", undefined, `${fileName}.txt`);
              } catch (procErr: any) {
                console.warn(`[Crawler] Scalable RAG error for ${targetUrl}:`, procErr.message);
                scalableResult = await client.processDocument(mockBlob, "offline", "adaptive", undefined, `${fileName}.txt`);
              }

              const ferventChunks = ScalableRagClient.toFerventCurieChunks(scalableResult);

              const formattedChunks = ferventChunks.map((ch, idx) => ({
                chunk_id: `chk_${nanoid(12)}`,
                file_id: fileId,
                section: ch.section,
                section_number: null,
                topic: ch.topic || "Web Ingestion",
                first_sentence: ch.content.slice(0, 100).replace(/\n/g, " "),
                content: ch.content,
                tags: ch.tags,
                chunk_index: idx,
                tier: ch.tier,
                parentId: ch.parentId,
              }));

              await fileDb.saveChunksBatch(c.env.DB, {
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
                source: "web",
              });

              for (const ch of formattedChunks) {
                try {
                  await c.env.DB.prepare(
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
                } catch {}
              }

              await fileDb.updateFileStatus(c.env.DB, fileId, "completed", formattedChunks.length);

              let vectorsUpserted = 0;

              if (openAiKey && c.env.VECTORIZE) {
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
                    c.env.VECTORIZE
                  );
                  vectorsUpserted = chunkToEmbed.length;
                } catch (vErr: any) {
                  console.warn(`[Crawler] Vectorize upsert warning for ${targetUrl}:`, vErr.message);
                }
              }

              crawled++;
              totalChunks += formattedChunks.length;
              totalVectors += vectorsUpserted;

              results.push({
                url: targetUrl,
                fileId,
                fileName,
                chunks: formattedChunks.length,
                vectors: vectorsUpserted
              });

            } catch (pageErr: any) {
              console.error(`[Crawler] Failed to process selected page ${pageUrl}:`, pageErr.message);
              results.push({
                url: pageUrl,
                error: pageErr.message
              });
            }
          })
        );
      }

      if (c.env.CACHE) {
        try { await purgeAllQueryCache(c.env.CACHE); } catch {}
      }

      return c.json({
        ok: true,
        crawled,
        results,
        totalChunks,
        totalVectors
      });
    } catch (err: any) {
      console.error("[Crawler] crawlSelected failed:", err.message);
      return c.json({ ok: false, message: err?.message || "Crawl selected failed" }, 500);
    }
  },
};
