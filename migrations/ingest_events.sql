-- Create ingest_events table
CREATE TABLE IF NOT EXISTS ingest_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  file_id TEXT,
  level TEXT, -- 'INFO' | 'WARN' | 'ERROR'
  message TEXT,
  at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT
);

-- Useful indexes for filtering/debugging
CREATE INDEX IF NOT EXISTS idx_ingest_events_job_id ON ingest_events(job_id);
CREATE INDEX IF NOT EXISTS idx_ingest_events_file_id ON ingest_events(file_id);
CREATE INDEX IF NOT EXISTS idx_ingest_events_level ON ingest_events(level);
CREATE INDEX IF NOT EXISTS idx_ingest_events_at ON ingest_events(at);
