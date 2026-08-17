import { Hono, type Context } from "hono";
import { DataController } from "../controllers/data.controller";
import { progressTrackerKV } from "../utils/progress-tracker";
import { requireAuthOrApiKey } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const router = new Hono<Env>();

const noStore = async (c: Context<Env>, next: () => Promise<void>) => {
  await next();
  c.header("Cache-Control", "no-store");
};

// Ingestion & File creation
router.post("/file-chunks", requireAuthOrApiKey, DataController.getFileChunks);
router.get("/preview-chunks/:uploadId", requireAuthOrApiKey, noStore, DataController.getPreviewChunksByUploadId);
router.post("/save-file", requireAuthOrApiKey, DataController.saveNewFile);
router.post("/save-file-chunks", requireAuthOrApiKey, DataController.finalizeChunks);
router.post("/save-file-chunks-only", requireAuthOrApiKey, DataController.finalizeChunksOnly);
router.get("/files/:fileId/download", requireAuthOrApiKey, DataController.downloadFile);

// Batch & Jobs
router.post("/admin-ingest", requireAuthOrApiKey, DataController.adminIngestBatch);
router.get("/ingest-jobs/:jobId", requireAuthOrApiKey, noStore, DataController.getIngestJobById);
router.get("/ingest-events", requireAuthOrApiKey, noStore, DataController.getIngestEvents);
router.post("/ingest/log", requireAuthOrApiKey, DataController.logIngestEvent);
router.post("/ingest/job/start", requireAuthOrApiKey, DataController.startIngestJob);
router.post("/ingest/job/finish", requireAuthOrApiKey, DataController.finishIngestJob);

// Knowledge management
router.get("/list", requireAuthOrApiKey, noStore, DataController.listFilesWithChunkCount);
router.get("/chunks-all", requireAuthOrApiKey, noStore, DataController.getAllChunks);
router.get("/chunks", requireAuthOrApiKey, noStore, DataController.getChunksByFileId);
router.get("/chunks/:chunkId/related", requireAuthOrApiKey, noStore, DataController.getRelatedTiers);
router.patch("/chunks/:chunkId", requireAuthOrApiKey, noStore, DataController.updateChunk);
router.delete("/chunks/:chunkId", requireAuthOrApiKey, noStore, DataController.deleteChunk);
router.get("/stats", requireAuthOrApiKey, noStore, DataController.getDashboardStats);

// File deletion (REST DELETE + backward-compat POST)
router.delete("/files/:fileId", requireAuthOrApiKey, noStore, DataController.deleteFile);
router.post("/files/:fileId", requireAuthOrApiKey, noStore, DataController.deleteFile);

// Upload progress
router.get("/progress/:uploadId", noStore, async (c) => {
  const uploadId = c.req.param("uploadId");
  const kv = progressTrackerKV(c.env.CACHE);
  const progress = await kv.get(uploadId);
  if (!progress) return c.json({ ok: false, message: "Invalid upload ID" }, 404);
  return c.json({ ok: true, ...progress });
});

export default router;
