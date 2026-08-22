import { Hono } from "hono";
import OpenAI from "openai";
import type { Env, EngineMode } from "../types.js";
import { detectFileType, validateFileSize } from "../extraction/detect.js";
import { cleanMarkdownContent } from "../chunking/cleaner.js";
import { buildAdaptiveTreeChunks } from "../chunking/tree-chunker.js";
import { buildAiSemanticTreeChunks } from "../chunking/llm-chunker.js";
import { classifyDocument, type ClassificationCategory } from "../chunking/classifier.js";
import { extractOffline } from "../extraction/offline.js";
import { extractDocumentHybrid, extractDocumentFullVision } from "../extraction/ai-vision.js";


const app = new Hono<{ Bindings: Env }>();

// ─── Upload document ────────────────────────────────────────────────

app.post("/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  let engineMode: EngineMode = "offline";
  const rawMode = String(formData.get("engineMode") || "").toLowerCase();
  if (rawMode === "ai-full") engineMode = "ai-full";
  else if (rawMode === "hybrid" || rawMode === "ai") engineMode = "hybrid";

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided." }, 400);
  }

  // Validate size
  const sizeError = validateFileSize(file.size);
  if (sizeError) {
    return c.json({ error: sizeError }, 400);
  }

  // Detect file type
  const data = await file.arrayBuffer();
  const detection = detectFileType(data, file.name);

  if (!detection.valid) {
    return c.json({ error: detection.error ?? "Unsupported file format." }, 400);
  }

  // Plain text & CSV files do not require 300 DPI Vision rendering — reroute to Free Edge offline
  if (detection.type === "text" || detection.type === "csv") {
    engineMode = "offline";
  }

  // Generate IDs
  const documentId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const r2Key = `uploads/${documentId}/${file.name}`;

  // Store raw file in R2
  await c.env.DOCUMENTS.put(r2Key, data, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { originalFilename: file.name, documentId },
  });

  // Check for client-rendered 300 DPI page screenshots (Option 3)
  const pageImages = formData.get("pageImages") as string;
  if (pageImages) {
    await c.env.DOCUMENTS.put(`uploads/${documentId}/page_images.json`, pageImages, {
      httpMetadata: { contentType: "application/json" },
    });
  }

  // Insert metadata into D1
  await c.env.DB.prepare(`
    INSERT INTO documents (id, filename, file_type, file_size, r2_key, status, engine_mode)
    VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)
  `).bind(documentId, file.name, detection.type, file.size, r2Key, engineMode).run();

  await c.env.DB.prepare(`
    INSERT INTO jobs (id, document_id, status, engine_mode)
    VALUES (?1, ?2, 'queued', ?3)
  `).bind(jobId, documentId, engineMode).run();

  // Enqueue for async processing
  await c.env.INGESTION_QUEUE.send({
    documentId,
    jobId,
    r2Key,
    filename: file.name,
    fileType: detection.type,
    engineMode,
  });

  return c.json(
    { documentId, jobId, filename: file.name, fileType: detection.type, status: "queued" },
    201,
  );
});

// ─── List documents (paginated) ─────────────────────────────────────

app.get("/", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10)), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query("status"); // optional filter

  let query = "SELECT * FROM documents";
  let countQuery = "SELECT COUNT(*) as total FROM documents";
  const bindings: unknown[] = [];
  const countBindings: unknown[] = [];

  if (status) {
    query += " WHERE status = ?1";
    countQuery += " WHERE status = ?1";
    bindings.push(status);
    countBindings.push(status);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  bindings.push(limit);
  query += " OFFSET ?";
  bindings.push(offset);

  const { results: documents } = await c.env.DB.prepare(query).bind(...bindings).all();
  const { results: countRows } = await c.env.DB.prepare(countQuery).bind(...countBindings).all();
  const total = (countRows?.[0] as any)?.total ?? 0;

  return c.json({
    documents,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ─── Get single document ────────────────────────────────────────────

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  return c.json({ document: results[0] });
});

// ─── Get extracted markdown content ─────────────────────────────────

app.get("/:id/content", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const doc = results[0] as any;

  if (doc.status !== "done" || !doc.extracted_r2_key) {
    return c.json({ error: "Content not yet extracted.", status: doc.status }, 202);
  }

  const object = await c.env.DOCUMENTS.get(doc.extracted_r2_key);
  if (!object) {
    return c.json({ error: "Extracted content not found in storage." }, 500);
  }

  const markdown = await object.text();
  return c.json({ documentId: id, filename: doc.filename, markdown });
});

// ─── Update extracted markdown content ──────────────────────────────

app.put("/:id/content", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const doc = results[0] as any;

  let body: { markdown?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON payload." }, 400);
  }

  if (typeof body.markdown !== "string") {
    return c.json({ error: "Field 'markdown' string is required." }, 400);
  }

  const r2Key = doc.extracted_r2_key || `extracted/${id}.md`;

  // Save updated markdown to R2 bucket
  await c.env.DOCUMENTS.put(r2Key, body.markdown, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });

  // Update timestamp and key in D1
  const now = new Date().toISOString().replace("T", " ").substring(0, 19);
  await c.env.DB.prepare(
    "UPDATE documents SET extracted_r2_key = ?1, updated_at = ?2 WHERE id = ?3",
  )
    .bind(r2Key, now, id)
    .run();

  return c.json({
    updated: true,
    documentId: id,
    filename: doc.filename,
    markdown: body.markdown,
  });
});

// ─── Get 3-Tier Chunks (with optional ?q=keyword search) ────────────

app.get("/:id/chunks", async (c) => {
  const id = c.req.param("id");
  const q = c.req.query("q")?.trim() || "";

  const { results: docResults } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!docResults || docResults.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const doc = docResults[0] as any;
  let chunkQuery = "SELECT * FROM document_chunks WHERE document_id = ?1";
  const bindings: unknown[] = [id];

  if (q) {
    chunkQuery += " AND content LIKE ?2";
    bindings.push(`%${q}%`);
  }

  chunkQuery += " ORDER BY chunk_index ASC";

  const { results: chunkResults } = await c.env.DB.prepare(chunkQuery).bind(...bindings).all();
  const chunks = (chunkResults || []) as any[];

  const large = chunks.filter((ch) => ch.tier === "large");
  const medium = chunks.filter((ch) => ch.tier === "medium");
  const small = chunks.filter((ch) => ch.tier === "small");

  return c.json({
    documentId: id,
    filename: doc.filename,
    query: q || null,
    classification: {
      category: doc.classification_category ?? "Prose_Standard",
      confidence: doc.classification_confidence ?? 0.85,
      reasoning: doc.classification_reasoning ?? "Default prose document classification.",
      suggestedCategory: doc.suggested_category ?? null,
    },
    counts: {
      large: large.length,
      medium: medium.length,
      small: small.length,
      total: chunks.length,
    },
    chunks: {
      large,
      medium,
      small,
      all: chunks,
    },
  });
});

// ─── Edit Individual Chunk Content ──────────────────────────────────

app.put("/:id/chunks/:chunkId", async (c) => {
  const id = c.req.param("id");
  const chunkId = c.req.param("chunkId");
  const body = (await c.req.json().catch(() => ({}))) as { content?: string };

  if (!body.content || typeof body.content !== "string") {
    return c.json({ error: "Content string is required." }, 400);
  }

  await c.env.DB.prepare("UPDATE document_chunks SET content = ?1 WHERE id = ?2 AND document_id = ?3")
    .bind(body.content, chunkId, id)
    .run();

  return c.json({ updated: true, chunkId, documentId: id });
});

// ─── Trigger Adaptive Chunking (Stage 1 -> Stage 2) ──────────────────

app.post("/:id/chunk", async (c) => {
  const id = c.req.param("id");
  const { results: docResults } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!docResults || docResults.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  let reqBody: { strategy?: "adaptive" | "ai" } = {};
  try {
    reqBody = await c.req.json();
  } catch {
    reqBody = {};
  }
  const strategy = reqBody.strategy || (c.req.query("strategy") as "adaptive" | "ai") || "adaptive";

  const doc = docResults[0] as any;
  const r2Key = doc.extracted_r2_key || `extracted/${id}.md`;
  const markdownObj = await c.env.DOCUMENTS.get(r2Key);
  if (!markdownObj) {
    return c.json({ error: "Extracted markdown file not found in storage." }, 404);
  }

  const rawMarkdown = await markdownObj.text();
  const cleanedMarkdown = cleanMarkdownContent(rawMarkdown);
  const targetCategory = (doc.classification_category || "Prose_Standard") as ClassificationCategory;

  let tree;
  if (strategy === "ai") {
    const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
    tree = await buildAiSemanticTreeChunks(openai, cleanedMarkdown, targetCategory, id);
  } else {
    tree = buildAdaptiveTreeChunks(cleanedMarkdown, targetCategory, id);
  }

  // Delete old chunks
  await c.env.DB.prepare("DELETE FROM document_chunks WHERE document_id = ?1").bind(id).run();

  if (tree.allNodes.length > 0) {
    const statements = tree.allNodes.map((node) =>
      c.env.DB.prepare(`
        INSERT INTO document_chunks (id, document_id, tier, chunk_index, parent_id, content, token_count, category)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `).bind(
        node.id,
        id,
        node.tier,
        node.chunkIndex,
        node.parentId,
        node.content,
        node.tokenCount,
        node.category
      )
    );

    for (let i = 0; i < statements.length; i += 50) {
      await c.env.DB.batch(statements.slice(i, i + 50));
    }
  }

  await c.env.DB.prepare("UPDATE documents SET is_chunked = 1, updated_at = datetime('now') WHERE id = ?1").bind(id).run();

  return c.json({
    chunked: true,
    documentId: id,
    category: targetCategory,
    chunkCounts: {
      large: tree.largeChunks.length,
      medium: tree.mediumChunks.length,
      small: tree.smallChunks.length,
      total: tree.allNodes.length,
    },
  });
});

// ─── Trigger Cloudflare Vectorize Indexing (Stage 2 -> Stage 3) ──────

app.post("/:id/index", async (c) => {
  const id = c.req.param("id");
  const { results: docResults } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!docResults || docResults.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const { results: chunkResults } = await c.env.DB.prepare("SELECT * FROM document_chunks WHERE document_id = ?1 AND tier IN ('small', 'medium')").bind(id).all();
  const chunks = (chunkResults || []) as any[];

  let vectorizedCount = 0;

  if (chunks.length > 0 && c.env.OPENAI_API_KEY) {
    try {
      const texts = chunks.map((ch) => ch.content.substring(0, 1000));
      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: texts,
        }),
      });

      if (embRes.ok) {
        const embData = await embRes.json() as { data: Array<{ embedding: number[] }> };
        if (embData?.data && c.env.VECTORIZE) {
          const vectorRecords = embData.data.map((emb, idx) => ({
            id: chunks[idx].id,
            values: emb.embedding,
            metadata: {
              document_id: id,
              tier: chunks[idx].tier,
              category: chunks[idx].category,
              chunk_index: chunks[idx].chunk_index,
            },
          }));

          await c.env.VECTORIZE.upsert(vectorRecords);
          vectorizedCount = vectorRecords.length;
        }
      }
    } catch (err: any) {
      console.error("Vectorize indexing warning:", err.message);
    }
  }

  await c.env.DB.prepare("UPDATE documents SET is_indexed = 1, updated_at = datetime('now') WHERE id = ?1").bind(id).run();

  return c.json({
    indexed: true,
    documentId: id,
    vectorizedCount,
    message: `Document indexed successfully into Cloudflare Vectorize (${vectorizedCount} vectors stored).`,
  });
});

// ─── Trigger Custom Re-Chunking / Re-Indexing ──────────────────────

app.post("/:id/rechunk", async (c) => {
  const id = c.req.param("id");
  let body: { category?: string; strategy?: "adaptive" | "ai" } = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const strategy = body.strategy || (c.req.query("strategy") as "adaptive" | "ai") || "adaptive";

  const { results: docResults } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!docResults || docResults.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const doc = docResults[0] as any;
  const r2Key = doc.extracted_r2_key || `extracted/${id}.md`;
  const markdownObj = await c.env.DOCUMENTS.get(r2Key);
  if (!markdownObj) {
    return c.json({ error: "Extracted markdown file not found in storage." }, 404);
  }

  const rawMarkdown = await markdownObj.text();
  const cleanedMarkdown = cleanMarkdownContent(rawMarkdown);
  const targetCategory = (body.category || doc.classification_category || "Prose_Standard") as ClassificationCategory;

  let tree;
  if (strategy === "ai") {
    const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
    tree = await buildAiSemanticTreeChunks(openai, cleanedMarkdown, targetCategory, id);
  } else {
    tree = buildAdaptiveTreeChunks(cleanedMarkdown, targetCategory, id);
  }

  // Delete old chunks
  await c.env.DB.prepare("DELETE FROM document_chunks WHERE document_id = ?1").bind(id).run();

  if (tree.allNodes.length > 0) {
    const statements = tree.allNodes.map((node) =>
      c.env.DB.prepare(`
        INSERT INTO document_chunks (id, document_id, tier, chunk_index, parent_id, content, token_count, category)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `).bind(
        node.id,
        id,
        node.tier,
        node.chunkIndex,
        node.parentId,
        node.content,
        node.tokenCount,
        node.category
      )
    );

    for (let i = 0; i < statements.length; i += 50) {
      await c.env.DB.batch(statements.slice(i, i + 50));
    }
  }

  await c.env.DB.prepare("UPDATE documents SET classification_category = ?1, is_chunked = 1, updated_at = datetime('now') WHERE id = ?2").bind(targetCategory, id).run();

  return c.json({
    rechunked: true,
    documentId: id,
    category: targetCategory,
    chunkCounts: {
      large: tree.largeChunks.length,
      medium: tree.mediumChunks.length,
      small: tree.smallChunks.length,
      total: tree.allNodes.length,
    },
  });
});

// ─── Delete document ────────────────────────────────────────────────

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM documents WHERE id = ?1").bind(id).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Document not found." }, 404);
  }

  const doc = results[0] as any;

  // Remove from R2
  try { await c.env.DOCUMENTS.delete(doc.r2_key); } catch { /* ignore */ }
  if (doc.extracted_r2_key) {
    try { await c.env.DOCUMENTS.delete(doc.extracted_r2_key); } catch { /* ignore */ }
  }

  // Remove from D1
  await c.env.DB.prepare("DELETE FROM jobs WHERE document_id = ?1").bind(id).run();
  await c.env.DB.prepare("DELETE FROM documents WHERE id = ?1").bind(id).run();

  return c.json({ deleted: true, id });
});

// ─── Synchronous Processing ─────────────────────────────────────────

app.post("/process-sync", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const rawMode = String(formData.get("engineMode") || "").toLowerCase();
    const strategy = String(formData.get("strategy") || "adaptive").toLowerCase();
    const pageImagesStr = formData.get("pageImages") as string;

    let engineMode = "offline";
    if (rawMode === "ai-full") engineMode = "ai-full";
    else if (rawMode === "hybrid" || rawMode === "ai") engineMode = "hybrid";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided." }, 400);
    }

    const sizeError = validateFileSize(file.size);
    if (sizeError) {
      return c.json({ error: sizeError }, 400);
    }

    const data = await file.arrayBuffer();
    const detection = detectFileType(data, file.name);

    if (!detection.valid) {
      return c.json({ error: detection.error ?? "Unsupported file format." }, 400);
    }

    // Plain text & CSV files do not require 300 DPI Vision rendering — reroute to Free Edge offline
    if (detection.type === "text" || detection.type === "csv") {
      engineMode = "offline";
    }

    const documentId = crypto.randomUUID();
    let markdown = "";
    const warnings: string[] = [];

    let pageImages: Array<{ pageNum: number; dataUrl: string }> = [];
    if (pageImagesStr) {
      try {
        pageImages = JSON.parse(pageImagesStr);
      } catch {
        pageImages = [];
      }
    }

    if (engineMode === "offline") {
      const res = await extractOffline(c.env, data, file.name, detection.type, documentId);
      markdown = res.markdown;
    } else if (engineMode === "hybrid") {
      markdown = await extractDocumentHybrid(c.env, openai, data, file.name, detection.type, warnings, pageImages);
    } else if (engineMode === "ai-full") {
      markdown = await extractDocumentFullVision(c.env, openai, data, file.name, detection.type, documentId, warnings, pageImages);
    }

    const cleanedMarkdown = cleanMarkdownContent(markdown);
    const classification = await classifyDocument(openai, cleanedMarkdown, file.name);

    let tree;
    if (strategy === "ai") {
      tree = await buildAiSemanticTreeChunks(openai, cleanedMarkdown, classification.category, documentId);
    } else {
      tree = buildAdaptiveTreeChunks(cleanedMarkdown, classification.category, documentId);
    }

    return c.json({
      ok: true,
      extraction: {
        engineMode,
        markdownLength: markdown.length,
      },
      fullMarkdown: cleanedMarkdown,
      classification: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      },

      chunks: {
        large: tree.largeChunks,
        medium: tree.mediumChunks,
        small: tree.smallChunks,
        all: tree.allNodes,
      },
      counts: {
        large: tree.largeChunks.length,
        medium: tree.mediumChunks.length,
        small: tree.smallChunks.length,
        total: tree.allNodes.length,
      }
    });
  } catch (err: any) {
    console.error("Sync processing error:", err);
    let userFriendlyMessage = err.message || "Processing failed";
    
    // Detect OpenAI quota/billing/credits errors
    const isQuotaError = 
      err?.status === 429 || 
      err?.code === "credit_balance_exhausted" ||
      err?.type === "insufficient_quota" ||
      (typeof err?.message === "string" && (
        err.message.includes("insufficient_quota") ||
        err.message.includes("credits remaining") ||
        err.message.includes("credit_balance_exhausted") ||
        err.message.includes("billing")
      ));

    if (isQuotaError) {
      userFriendlyMessage = "OpenAI API quota exhausted. Please add credits to your OpenAI account (https://platform.openai.com/settings/organization/billing) or update your OPENAI_API_KEY in .dev.vars.";
    }

    return c.json({ error: userFriendlyMessage, details: err.message }, 500);
  }
});

export default app;
