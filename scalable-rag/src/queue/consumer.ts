import OpenAI from "openai";
import type { Env, QueueMessage } from "../types.js";
import { extractOffline } from "../extraction/offline.js";
import { extractWithAI } from "../extraction/ai-vision.js";
import { cleanMarkdownContent } from "../chunking/cleaner.js";
import { classifyDocument } from "../chunking/classifier.js";
import { buildAdaptiveTreeChunks } from "../chunking/tree-chunker.js";

/**
 * Queue consumer — processes document extraction jobs asynchronously.
 *
 * Each message contains a reference to a document in R2. The consumer:
 * 1. Fetches the raw file from R2
 * 2. Runs the selected extraction pipeline (offline or AI)
 * 3. Stores the extracted markdown back in R2
 * 4. Updates D1 records with results
 */
export async function handleQueue(
  batch: MessageBatch<QueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const msg = message.body;

    try {
      // Mark as processing
      await updateStatus(env, msg.documentId, msg.jobId, "processing");

      // Fetch raw file from R2
      const object = await env.DOCUMENTS.get(msg.r2Key);
      if (!object) {
        throw new Error(`File not found in R2: ${msg.r2Key}`);
      }
      const data = await object.arrayBuffer();

      // Run extraction
      const result =
        msg.engineMode === "offline"
          ? await extractOffline(env, data, msg.filename, msg.fileType, msg.documentId)
          : await extractWithAI(env, data, msg.filename, msg.fileType, msg.documentId, msg.engineMode);

      // ─── Step 1: Clean Extracted Markdown ─────────────────────────────
      const cleanedMarkdown = cleanMarkdownContent(result.markdown);

      // ─── Step 2: Classify Document via LLM ────────────────────────────
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const classification = await classifyDocument(openai, cleanedMarkdown, msg.filename);

      // ─── Step 3: Build Adaptive 3-Tier Tree Chunks ───────────────────
      const tree = buildAdaptiveTreeChunks(cleanedMarkdown, classification.category, msg.documentId);

      // Store extracted cleaned markdown in R2
      const extractedKey = `extracted/${msg.documentId}.md`;
      await env.DOCUMENTS.put(extractedKey, cleanedMarkdown, {
        httpMetadata: { contentType: "text/markdown; charset=utf-8" },
        customMetadata: {
          documentId: msg.documentId,
          filename: msg.filename,
          engineMode: msg.engineMode,
          category: classification.category,
          confidence: String(classification.confidence),
          pageCount: String(result.pageCount),
          processingTimeMs: String(result.processingTimeMs),
        },
      });

      // ─── Step 4: Persist 3-Tier Tree Chunks to D1 ──────────────────────
      // Delete old chunks if any
      await env.DB.prepare(`DELETE FROM document_chunks WHERE document_id = ?1`).bind(msg.documentId).run();

      if (tree.allNodes.length > 0) {
        const statements = tree.allNodes.map((node) =>
          env.DB.prepare(`
            INSERT INTO document_chunks (id, document_id, tier, chunk_index, parent_id, content, token_count, category)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
          `).bind(
            node.id,
            msg.documentId,
            node.tier,
            node.chunkIndex,
            node.parentId,
            node.content,
            node.tokenCount,
            node.category
          )
        );

        // Batch insert in chunks of 50 to respect D1 limits
        for (let i = 0; i < statements.length; i += 50) {
          await env.DB.batch(statements.slice(i, i + 50));
        }
      }

      // ─── Step 5: Update D1 Document Record with Classification ──────
      await env.DB.prepare(`
        UPDATE documents
        SET status = 'done',
            page_count = ?1,
            extracted_r2_key = ?2,
            error_message = ?3,
            classification_category = ?4,
            classification_confidence = ?5,
            classification_reasoning = ?6,
            suggested_category = ?7,
            suggested_chunking_rule = ?8,
            is_chunked = 1,
            updated_at = datetime('now')
        WHERE id = ?9
      `).bind(
        result.pageCount,
        extractedKey,
        result.warnings.length > 0 ? result.warnings.join("; ") : null,
        classification.category,
        classification.confidence,
        classification.reasoning,
        classification.suggestedCategory ?? null,
        classification.suggestedChunkingStrategy ?? null,
        msg.documentId,
      ).run();

      await env.DB.prepare(`
        UPDATE jobs
        SET status = 'done',
            completed_at = datetime('now'),
            processing_time_ms = ?1
        WHERE id = ?2
      `).bind(result.processingTimeMs, msg.jobId).run();

      message.ack();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[queue] Failed to process ${msg.documentId}:`, errorMsg);

      try {
        await env.DB.prepare(`
          UPDATE documents
          SET status = 'failed', error_message = ?1, updated_at = datetime('now')
          WHERE id = ?2
        `).bind(errorMsg, msg.documentId).run();

        await env.DB.prepare(`
          UPDATE jobs
          SET status = 'failed', error = ?1, completed_at = datetime('now')
          WHERE id = ?2
        `).bind(errorMsg, msg.jobId).run();
      } catch (dbErr) {
        console.error(`[queue] Failed to update error status in DB:`, dbErr);
      }

      // Ack to prevent infinite retries on permanent failures.
      // For transient errors, you could call message.retry() instead.
      message.ack();
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function updateStatus(
  env: Env,
  documentId: string,
  jobId: string,
  status: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE documents SET status = ?1, updated_at = datetime('now') WHERE id = ?2`,
  ).bind(status, documentId).run();

  await env.DB.prepare(
    `UPDATE jobs SET status = ?1, started_at = datetime('now') WHERE id = ?2`,
  ).bind(status, jobId).run();
}
