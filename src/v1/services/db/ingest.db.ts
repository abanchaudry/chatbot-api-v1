import type { D1Database } from '@cloudflare/workers-types';

export const ingestDb = {
  async startJob(DB: D1Database, source: 'admin'|'cron', total: number) {
    const id = crypto.randomUUID();
    await DB.prepare(`
      INSERT INTO ingest_jobs (id, source, status, total_files, processed_files, failed_files, started_at)
      VALUES (?, ?, 'running', ?, 0, 0, datetime())
    `).bind(id, source, total).run();
    return id;
  },

  async finishJob(DB: D1Database, jobId: string, status: 'completed'|'failed', error?: string) {
    await DB.prepare(`
      UPDATE ingest_jobs SET status=?, finished_at=datetime(), error_message=? WHERE id=?
    `).bind(status, error || null, jobId).run();
  },

  async incProcessed(DB: D1Database, jobId: string) {
    await DB.prepare(`UPDATE ingest_jobs SET processed_files = processed_files + 1 WHERE id=?`)
      .bind(jobId).run();
  },

  async incFailed(DB: D1Database, jobId: string) {
    await DB.prepare(`UPDATE ingest_jobs SET failed_files = failed_files + 1 WHERE id=?`)
      .bind(jobId).run();
  },

  async log(DB: D1Database, jobId: string|null, fileId: string|null, level: 'INFO'|'WARN'|'ERROR', message: string) {
    await DB.prepare(`
      INSERT INTO ingest_events (job_id, file_id, level, message) VALUES (?, ?, ?, ?)
    `).bind(jobId, fileId, level, message).run();
  },
};
