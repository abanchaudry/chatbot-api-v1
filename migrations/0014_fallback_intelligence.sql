-- migrations/0014_fallback_intelligence.sql
-- Stores raw fallback queries for LLM gap analysis & clustering
CREATE TABLE IF NOT EXISTS fallback_queries (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  user_id TEXT,
  query_text TEXT NOT NULL,
  reason TEXT,
  cluster_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores LLM-generated semantic topic clusters and recommendations
CREATE TABLE IF NOT EXISTS fallback_clusters (
  id TEXT PRIMARY KEY,
  cluster_name TEXT NOT NULL,
  summary TEXT,
  query_count INTEGER NOT NULL DEFAULT 0,
  sample_queries TEXT NOT NULL, -- JSON array of 3-5 sample user queries
  suggested_action TEXT, -- LLM recommendation on missing knowledge
  is_new_category INTEGER DEFAULT 0, -- 1 if LLM suggests a new category
  suggested_category_name TEXT,
  frequency_period TEXT DEFAULT 'weekly', -- 'daily' | 'weekly' | 'monthly' | 'manual'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fallback_queries_created_at ON fallback_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_fallback_queries_cluster_id ON fallback_queries(cluster_id);
CREATE INDEX IF NOT EXISTS idx_fallback_clusters_period ON fallback_clusters(frequency_period);
CREATE INDEX IF NOT EXISTS idx_fallback_clusters_created_at ON fallback_clusters(created_at);

-- Add fallback_schedule column to system_settings if it doesn't exist
ALTER TABLE system_settings ADD COLUMN fallback_schedule TEXT DEFAULT 'weekly';
