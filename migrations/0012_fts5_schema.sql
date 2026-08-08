-- 0012_fts5_schema.sql: SQLite FTS5 Full-Text Search Virtual Table for D1
CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
  id UNINDEXED,
  document_id UNINDEXED,
  tier UNINDEXED,
  content,
  category,
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers to auto-sync document_chunks table with document_chunks_fts
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
