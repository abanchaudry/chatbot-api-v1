import { Hono, type Context } from "hono";
import { DataController } from "../controllers/data.controller";
import { progressTrackerKV } from "../utils/progress-tracker";
import type { Env } from "../types/env";

const router = new Hono<Env>();

const requireApiKey = async (c: Context<Env>, next: () => Promise<void>) => {
  const configured = c.env.ADMIN_API_KEY || (await c.env.CONFIG.get("ADMIN_API_KEY"));
  if (!configured) {
    return c.json({ ok: false, message: "Server misconfig: ADMIN_API_KEY not set" }, 503);
  }
  const key = c.req.header("x-api-key");
  if (!key || key !== configured) {
    return c.json({ ok: false, message: "Unauthorized" }, 401);
  }
  await next();
};

const noStore = async (c: Context<Env>, next: () => Promise<void>) => {
  await next();
  c.header("Cache-Control", "no-store");
};

router.post("/file-chunks", requireApiKey, DataController.getFileChunks);
router.get("/preview-chunks/:uploadId", requireApiKey, noStore, DataController.getPreviewChunksByUploadId);
router.post("/save-file", requireApiKey, DataController.saveNewFile); 
router.post("/save-file-chunks", requireApiKey, DataController.finalizeChunks);
router.post("/save-file-chunks-only", requireApiKey, DataController.finalizeChunksOnly);
router.get("/files/:fileId/download", requireApiKey, DataController.downloadFile);


router.post("/admin-ingest", requireApiKey, DataController.adminIngestBatch);


router.get("/ingest-jobs/:jobId", requireApiKey, noStore, DataController.getIngestJobById);
router.get("/ingest-events", requireApiKey, noStore, DataController.getIngestEvents);

router.post("/ingest/log", requireApiKey, DataController.logIngestEvent);
router.post("/ingest/job/start", requireApiKey, DataController.startIngestJob);
router.post("/ingest/job/finish", requireApiKey, DataController.finishIngestJob);

router.get("/list", requireApiKey, noStore, DataController.listFilesWithChunkCount);
router.get("/chunks-all", requireApiKey, noStore, DataController.getAllChunks);
router.get("/chunks", requireApiKey, noStore, DataController.getChunksByFileId);
router.get("/chunks/:chunkId/related", requireApiKey, noStore, DataController.getRelatedTiers);
router.patch("/chunks/:chunkId", requireApiKey, noStore, DataController.updateChunk);
router.post("/chunks/:chunkId", requireApiKey, noStore, DataController.updateChunk);
router.post("/chunks/:chunkId/update", requireApiKey, noStore, DataController.updateChunk);
router.delete("/chunks/:chunkId", requireApiKey, noStore, DataController.deleteChunk);
router.get("/stats", requireApiKey, noStore, DataController.getDashboardStats);

router.post("/files/:fileId", requireApiKey, noStore, DataController.deleteFile);


router.get("/progress/:uploadId", noStore, async (c) => {
  const uploadId = c.req.param("uploadId");
  const kv = progressTrackerKV(c.env.CACHE);
  const progress = await kv.get(uploadId);
  if (!progress) return c.json({ ok: false, message: "Invalid upload ID" }, 404);
  return c.json({ ok: true, ...progress });
});

export default router;
