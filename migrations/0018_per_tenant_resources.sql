-- Create client_resources table
CREATE TABLE IF NOT EXISTS client_resources (
  client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  d1_database_id TEXT,
  d1_database_name TEXT,
  kv_namespace_id TEXT,
  kv_namespace_name TEXT,
  vectorize_admin_index TEXT,
  vectorize_pdf_index TEXT,
  vectorize_web_index TEXT,
  vectorize_cache_index TEXT,
  r2_bucket_name TEXT,
  provisioning_status TEXT DEFAULT 'pending',
  provisioning_error TEXT,
  provisioned_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create api_key_requests table
CREATE TABLE IF NOT EXISTS api_key_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by INTEGER REFERENCES auth(id),
  reviewed_by INTEGER REFERENCES auth(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_requests_client_id ON api_key_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_api_key_requests_status ON api_key_requests(status);

-- Note: In client_secrets table, columns cf_account_id, cf_api_token_encrypted, and cf_api_token_iv 
-- are now deprecated and will be ignored. SQLite does not support DROP COLUMN in older versions easily.

-- Note: In clients table, the billing_mode semantics have changed:
-- 'platform' means platform-managed OpenAI key.
-- 'byok' means client provides their own OpenAI key.
