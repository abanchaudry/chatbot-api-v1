-- Add tier and parent_id columns to chunks table for 3-tier hierarchical chunking support
ALTER TABLE chunks ADD COLUMN tier TEXT DEFAULT 'standard';
ALTER TABLE chunks ADD COLUMN parent_id TEXT DEFAULT NULL;

-- Index for tier-based filtering during RAG search (e.g. only search 'small' leaf chunks)
CREATE INDEX IF NOT EXISTS idx_chunks_tier ON chunks(tier);
-- Index for parent-child relationship lookups
CREATE INDEX IF NOT EXISTS idx_chunks_parent_id ON chunks(parent_id);
