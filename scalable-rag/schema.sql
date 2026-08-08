-- Scalable RAG — D1 Schema
-- Module 1: Document Ingestion & Text Extraction

CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  r2_key        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  engine_mode   TEXT NOT NULL DEFAULT 'offline',
  page_count    INTEGER,
  extracted_r2_key TEXT,
  error_message TEXT,
  classification_category TEXT,
  classification_confidence REAL,
  classification_reasoning TEXT,
  suggested_category TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id              TEXT PRIMARY KEY,
  document_id     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued',
  engine_mode     TEXT NOT NULL,
  started_at      TEXT,
  completed_at    TEXT,
  processing_time_ms INTEGER,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id              TEXT PRIMARY KEY,
  document_id     TEXT NOT NULL,
  tier            TEXT NOT NULL, -- 'large' | 'medium' | 'small'
  chunk_index     INTEGER NOT NULL,
  parent_id       TEXT,
  content         TEXT NOT NULL,
  token_count     INTEGER NOT NULL,
  category        TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_document ON jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tier ON document_chunks(tier);
