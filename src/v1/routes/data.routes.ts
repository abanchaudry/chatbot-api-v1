import { Hono, type Context } from "hono";
import { DataController } from "../controllers/data.controller";
import { progressTrackerKV } from "../utils/progress-tracker";
import { requireAuthOrApiKey, resolveTenantContext } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const router = new Hono<Env>();

const noStore = async (c: Context<Env>, next: () => Promise<void>) => {
  await next();
  c.header("Cache-Control", "no-store");
};

// Ingestion & File creation
router.post("/file-chunks", requireAuthOrApiKey, resolveTenantContext, DataController.getFileChunks);
router.get("/preview-chunks/:uploadId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getPreviewChunksByUploadId);
router.post("/save-file", requireAuthOrApiKey, resolveTenantContext, DataController.saveNewFile);
router.post("/save-file-chunks", requireAuthOrApiKey, resolveTenantContext, DataController.finalizeChunks);
router.post("/save-file-chunks-only", requireAuthOrApiKey, resolveTenantContext, DataController.finalizeChunksOnly);
router.get("/files/:fileId/download", requireAuthOrApiKey, resolveTenantContext, DataController.downloadFile);

// Batch & Jobs
router.post("/admin-ingest", requireAuthOrApiKey, resolveTenantContext, DataController.adminIngestBatch);
router.get("/ingest-jobs/:jobId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getIngestJobById);
router.get("/ingest-events", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getIngestEvents);
router.post("/ingest/log", requireAuthOrApiKey, resolveTenantContext, DataController.logIngestEvent);
router.post("/ingest/job/start", requireAuthOrApiKey, resolveTenantContext, DataController.startIngestJob);
router.post("/ingest/job/finish", requireAuthOrApiKey, resolveTenantContext, DataController.finishIngestJob);

// Knowledge management
router.get("/list", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.listFilesWithChunkCount);
router.get("/chunks-all", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getAllChunks);
router.get("/chunks", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getChunksByFileId);
router.get("/chunks/:chunkId/related", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getRelatedTiers);
router.patch("/chunks/:chunkId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.updateChunk);
router.delete("/chunks/:chunkId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.deleteChunk);
router.get("/stats", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.getDashboardStats);

// File deletion (REST DELETE + backward-compat POST)
router.delete("/files/:fileId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.deleteFile);
router.post("/files/:fileId", requireAuthOrApiKey, resolveTenantContext, noStore, DataController.deleteFile);

// Upload progress
router.get("/progress/:uploadId", noStore, async (c) => {
  const uploadId = c.req.param("uploadId");
  if (!uploadId) return c.json({ ok: false, message: "uploadId required" }, 400);

  const tracker = progressTrackerKV(c.env.CACHE);
  const state = await tracker.get(uploadId);

  if (!state) return c.json({ ok: false, message: "Progress not found" }, 404);
  return c.json({ ok: true, progress: state });
});

export default router;
