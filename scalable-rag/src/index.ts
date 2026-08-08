import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, QueueMessage } from "./types.js";
import documents from "./routes/documents.js";
import jobs from "./routes/jobs.js";
import { handleQueue } from "./queue/consumer.js";

// ─── App ────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env }>();

// CORS for local dev
app.use("/api/*", cors());

// API routes
app.route("/api/documents", documents);
app.route("/api/jobs", jobs);

// Health check
app.get("/api/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ─── Worker export ──────────────────────────────────────────────────

export default {
  fetch: app.fetch,

  // Queue consumer — triggered when messages land on the ingestion queue
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    await handleQueue(batch, env);
  },
};
