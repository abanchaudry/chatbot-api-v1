-- Create ingest_jobs table
CREATE TABLE IF NOT EXISTS ingest_jobs (
  id TEXT PRIMARY KEY, -- jobId (uuid/nanoid)

  source TEXT NOT NULL, -- 'admin' | 'cron'
  status TEXT NOT NULL, -- 'queued' | 'running' | 'completed' | 'failed'

  total_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,

  started_at TEXT,
  finished_at TEXT,

  error_message TEXT
);

-- Useful indexes for filtering/polling
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status ON ingest_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_source ON ingest_jobs(source);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_started_at ON ingest_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_finished_at ON ingest_jobs(finished_at);
