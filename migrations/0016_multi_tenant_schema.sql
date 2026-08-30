-- migrations/0016_multi_tenant_schema.sql
-- Multi-Tenant SaaS Schema: Clients, Encrypted Secrets, Role-Based Auth, and Tenant Scoping

-- 1. Clients / Businesses Table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  billing_mode TEXT NOT NULL DEFAULT 'platform', -- 'platform' | 'byok'
  public_token TEXT UNIQUE NOT NULL,             -- 'pk_live_...' for chat widget Option A
  status TEXT NOT NULL DEFAULT 'active',         -- 'active' | 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_public_token ON clients(public_token);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- 2. Client Secrets Table (Encrypted at rest with AES-GCM)
CREATE TABLE IF NOT EXISTS client_secrets (
  client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  openai_api_key_encrypted TEXT,
  openai_api_key_iv TEXT,
  cf_account_id TEXT,
  cf_api_token_encrypted TEXT,
  cf_api_token_iv TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Auth Table with Roles and Tenant Association
ALTER TABLE auth ADD COLUMN role TEXT NOT NULL DEFAULT 'client_admin';
ALTER TABLE auth ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE auth ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_auth_role ON auth(role);
CREATE INDEX IF NOT EXISTS idx_auth_client_id ON auth(client_id);

-- 4. Add client_id to System Settings and Tenant Scoped Data Tables
ALTER TABLE system_settings ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE files ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE chunks ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE threads ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE messages ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE logs ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE message_traces ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE ingest_jobs ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE ingest_events ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE upload_progress ADD COLUMN client_id TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_system_settings_client ON system_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_files_client_id ON files(client_id);
CREATE INDEX IF NOT EXISTS idx_chunks_client_id ON chunks(client_id);
CREATE INDEX IF NOT EXISTS idx_threads_client_id ON threads(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_logs_client_id ON logs(client_id);
CREATE INDEX IF NOT EXISTS idx_message_traces_client_id ON message_traces(client_id);

-- 5. Seed Default Client & Upgrade Existing Auth Users to Super Admin
INSERT OR IGNORE INTO clients (id, name, slug, domain, billing_mode, public_token, status)
VALUES ('default', 'Default Business', 'default', 'localhost', 'platform', 'pk_live_default_demo_token', 'active');

-- Set existing auth users to super_admin so the current admin login continues working with full privileges
UPDATE auth SET role = 'super_admin' WHERE role IS NULL OR role = 'client_admin';
