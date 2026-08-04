-- migrations/000X_create_upload_progress_table.sql
CREATE TABLE IF NOT EXISTS upload_progress (
  upload_id TEXT PRIMARY KEY,
  file_name TEXT,
  total_batches INTEGER,
  completed_batches INTEGER,
  status TEXT, -- 'processing' | 'completed' | 'failed'
  error TEXT,
  steps TEXT
);

CREATE INDEX IF NOT EXISTS idx_upload_progress_status ON upload_progress(status);
CREATE INDEX IF NOT EXISTS idx_upload_progress_file_name ON upload_progress(file_name);
