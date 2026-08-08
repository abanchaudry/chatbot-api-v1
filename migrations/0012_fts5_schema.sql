-- Create document_chunks table if not exists (for multi-format 3-tier chunks)
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  parent_id TEXT,
  content TEXT NOT NULL,
  token_count INTEGER,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 table for document_chunks (multi-format 3-tier chunks)
CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
  id UNINDEXED,
  document_id UNINDEXED,
  tier UNINDEXED,
  content,
  category,
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers for document_chunks
CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ai AFTER INSERT ON document_chunks BEGIN
  INSERT INTO document_chunks_fts(id, document_id, tier, content, category)
  VALUES (new.id, new.document_id, new.tier, new.content, new.category);
END;

CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ad AFTER DELETE ON document_chunks BEGIN
  DELETE FROM document_chunks_fts WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_document_chunks_au AFTER UPDATE ON document_chunks BEGIN
  UPDATE document_chunks_fts
  SET content = new.content, category = new.category
  WHERE id = old.id;
END;

-- FTS5 table for chunks (standard RAG chunks)
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id UNINDEXED,
  file_id UNINDEXED,
  section,
  topic,
  content,
  tags,
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers for chunks
CREATE TRIGGER IF NOT EXISTS trg_chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, chunk_id, file_id, section, topic, content, tags)
  VALUES (new.rowid, new.chunk_id, new.file_id, new.section, new.topic, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS trg_chunks_ad AFTER DELETE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE rowid = old.rowid;
END;

-- Populate chunks_fts with existing chunks
INSERT INTO chunks_fts(rowid, chunk_id, file_id, section, topic, content, tags)
SELECT rowid, chunk_id, file_id, section, topic, content, tags FROM chunks
WHERE rowid NOT IN (SELECT rowid FROM chunks_fts);
