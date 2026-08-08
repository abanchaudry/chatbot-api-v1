import { Hono } from "hono";
import type { Env } from "../types.js";

const app = new Hono<{ Bindings: Env }>();

// ─── List recent jobs ───────────────────────────────────────────────

app.get("/", async (c) => {
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10)), 100);
  const status = c.req.query("status");

  let query = "SELECT j.*, d.filename FROM jobs j LEFT JOIN documents d ON j.document_id = d.id";
  const bindings: unknown[] = [];

  if (status) {
    query += " WHERE j.status = ?1";
    bindings.push(status);
  }

  query += " ORDER BY j.created_at DESC LIMIT ?";
  bindings.push(limit);

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ jobs: results });
});

// ─── Get single job ─────────────────────────────────────────────────

app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const { results } = await c.env.DB.prepare(`
    SELECT j.*, d.filename, d.file_type, d.status as document_status
    FROM jobs j
    LEFT JOIN documents d ON j.document_id = d.id
    WHERE j.id = ?1
  `).bind(id).all();

  if (!results || results.length === 0) {
    return c.json({ error: "Job not found." }, 404);
  }

  return c.json({ job: results[0] });
});

export default app;
