-- Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  chunk_id TEXT PRIMARY KEY,
  source TEXT,
  content TEXT NOT NULL,
  version TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  tags TEXT,
  topic TEXT,
  section TEXT,
  section_number TEXT,
  section_keywords TEXT,

  first_sentence TEXT,
  chunk_index INTEGER,

  priority_level TEXT NOT NULL DEFAULT 'normal',
  file_id TEXT,
  content_hash TEXT,
  embedding_model TEXT,
  chunk_method TEXT
);

-- Performance indexes (RAG-critical)
CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_section_number ON chunks(section_number);
CREATE INDEX IF NOT EXISTS idx_chunks_priority ON chunks(priority_level);
CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON chunks(chunk_index);
