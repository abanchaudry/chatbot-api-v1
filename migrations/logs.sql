-- migrations/000X_create_logs_table.sql
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  action TEXT,
  file_name TEXT,
  chunk_id TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_file_name ON logs(file_name);
CREATE INDEX IF NOT EXISTS idx_logs_chunk_id ON logs(chunk_id);
