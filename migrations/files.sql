-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_status TEXT NOT NULL,

  file_id TEXT,
  file_path TEXT,

  is_deleted BOOLEAN NOT NULL DEFAULT 0,
  deleted_date TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,

  checksum TEXT,
  source TEXT NOT NULL DEFAULT 'admin',
  version TEXT,
  upload_id TEXT,

  chunk_method TEXT,
  embedding_model TEXT,
  chunk_count TEXT,

  error_message TEXT
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_files_file_id ON files(file_id);
CREATE INDEX IF NOT EXISTS idx_files_upload_id ON files(upload_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(file_status);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
CREATE INDEX IF NOT EXISTS idx_files_source ON files(source);
