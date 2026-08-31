// src/v1/services/cloudflare-provisioner.service.ts
import { sleep, backoff } from '../utils/retry';

export interface ProvisioningResult {
  d1_database_id: string;
  d1_database_name: string;
  kv_namespace_id: string;
  kv_namespace_name: string;
  vectorize_admin_index: string;
  vectorize_pdf_index: string;
  vectorize_web_index: string;
  vectorize_cache_index: string;
  r2_bucket_name: string;
}

export interface ClientResources {
  client_id: string;
  d1_database_id?: string | null;
  d1_database_name: string;
  kv_namespace_id?: string | null;
  kv_namespace_name: string;
  vectorize_admin_index: string;
  vectorize_pdf_index: string;
  vectorize_web_index: string;
  vectorize_cache_index: string;
  r2_bucket_name: string;
  provisioning_status: string;
  provisioning_error?: string;
  provisioned_at?: string;
}

export const cloudflareProvisionerService = {
  async fetchWithRetry(url: string, options: RequestInit): Promise<any> {
    let attempt = 0;
    while (attempt < 3) {
      try {
        const response = await fetch(url, options);
        const data = await response.json() as any;
        if (!response.ok) {
          throw new Error(`Cloudflare API Error: ${JSON.stringify(data.errors || data)}`);
        }
        return data;
      } catch (error: any) {
        // If it's a known conflict / already exists, don't retry, let caller handle
        if (error?.message && (error.message.includes('already exists') || error.message.includes('7502') || error.message.includes('10014') || error.message.includes('10006'))) {
          throw error;
        }
        attempt++;
        if (attempt >= 3) throw error;
        await sleep(backoff(attempt));
      }
    }
  },

  async createD1Database(accountId: string, apiToken: string, dbName: string): Promise<{ uuid: string; name: string }> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;
      const data = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: dbName })
      });
      return data.result;
    } catch (err: any) {
      // If already exists, lookup existing UUID
      if (err?.message?.includes('already exists') || err?.message?.includes('7502')) {
        const listUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database?name=${encodeURIComponent(dbName)}`;
        const listRes = await fetch(listUrl, {
          headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        const listData = await listRes.json() as any;
        const found = listData?.result?.find((db: any) => db.name === dbName) || listData?.result?.[0];
        if (found?.uuid) {
          return { uuid: found.uuid, name: found.name };
        }
      }
      throw err;
    }
  },

  async executeD1Sql(accountId: string, apiToken: string, databaseId: string, sql: string, params: any[] = []): Promise<any> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    const data = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });
    return data.result;
  },

  async createKVNamespace(accountId: string, apiToken: string, title: string): Promise<{ id: string; title: string }> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`;
      const data = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
      return data.result;
    } catch (err: any) {
      if (err?.message?.includes('already exists') || err?.message?.includes('10014')) {
        const listUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces`;
        const listRes = await fetch(listUrl, {
          headers: { 'Authorization': `Bearer ${apiToken}` }
        });
        const listData = await listRes.json() as any;
        const found = listData?.result?.find((kv: any) => kv.title === title);
        if (found?.id) {
          return { id: found.id, title: found.title };
        }
      }
      throw err;
    }
  },

  async createVectorizeIndex(accountId: string, apiToken: string, indexName: string): Promise<{ name: string }> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes`;
      const data = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: indexName,
          config: { dimensions: 1536, metric: 'cosine' },
          description: `Vector index for ${indexName}`
        })
      });
      return data.result || { name: indexName };
    } catch (err: any) {
      if (err?.message?.includes('already exists') || err?.message?.includes('10014') || err?.message?.includes('already registered')) {
        return { name: indexName };
      }
      throw err;
    }
  },

  async createR2Bucket(accountId: string, apiToken: string, bucketName: string): Promise<{ name: string }> {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
      const data = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: bucketName })
      });
      return data.result || { name: bucketName };
    } catch (err: any) {
      if (err?.message?.includes('already exists') || err?.message?.includes('10006') || err?.message?.includes('409')) {
        return { name: bucketName };
      }
      if (err?.message?.includes('10042') || err?.message?.includes('enable R2')) {
        console.warn(`[Provisioner] R2 is not enabled on Cloudflare account. Skipping R2 bucket creation.`);
        return { name: bucketName };
      }
      throw err;
    }
  },

  async deleteAllResources(accountId: string, apiToken: string, resources: ClientResources): Promise<void> {
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };

    if (resources.d1_database_id) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${resources.d1_database_id}`, { method: 'DELETE', headers }).catch(() => {});
    }
    
    if (resources.kv_namespace_id) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${resources.kv_namespace_id}`, { method: 'DELETE', headers }).catch(() => {});
    }
    
    const indexes = [
      resources.vectorize_admin_index,
      resources.vectorize_pdf_index,
      resources.vectorize_web_index,
      resources.vectorize_cache_index
    ].filter(Boolean);
    
    for (const idx of indexes) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${idx}`, { method: 'DELETE', headers }).catch(() => {});
    }
    
    if (resources.r2_bucket_name) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${resources.r2_bucket_name}`, { method: 'DELETE', headers }).catch(() => {});
    }
  },

  async provisionTenantResources(accountId: string, apiToken: string, slug: string): Promise<ProvisioningResult> {
    const dbName = `chatbot-${slug}-db`;
    const dbResult = await this.createD1Database(accountId, apiToken, dbName);
    
    // Execute each schema statement sequentially on the D1 database
    const statements = this.getTenantSchemaStatements();
    for (const stmt of statements) {
      if (stmt && stmt.trim()) {
        try {
          await this.executeD1Sql(accountId, apiToken, dbResult.uuid, stmt.trim());
        } catch (sqlErr: any) {
          console.warn(`[Provisioner D1 Schema Warning]:`, sqlErr?.message || sqlErr);
        }
      }
    }
    
    const kvTitle = `chatbot-${slug}-cache`;
    const kvResult = await this.createKVNamespace(accountId, apiToken, kvTitle);
    
    const adminIndex = `chatbot-${slug}-admin`;
    const pdfIndex = `chatbot-${slug}-pdf`;
    const webIndex = `chatbot-${slug}-web`;
    const cacheIndex = `chatbot-${slug}-qcache`;
    
    await this.createVectorizeIndex(accountId, apiToken, adminIndex);
    await this.createVectorizeIndex(accountId, apiToken, pdfIndex);
    await this.createVectorizeIndex(accountId, apiToken, webIndex);
    await this.createVectorizeIndex(accountId, apiToken, cacheIndex);
    
    const bucketName = `chatbot-${slug}-storage`;
    const r2Result = await this.createR2Bucket(accountId, apiToken, bucketName);
    
    return {
      d1_database_id: dbResult.uuid,
      d1_database_name: dbResult.name,
      kv_namespace_id: kvResult.id,
      kv_namespace_name: kvResult.title,
      vectorize_admin_index: adminIndex,
      vectorize_pdf_index: pdfIndex,
      vectorize_web_index: webIndex,
      vectorize_cache_index: cacheIndex,
      r2_bucket_name: r2Result.name
    };
  },

  getTenantSchemaStatements(): string[] {
    return [
      `CREATE TABLE IF NOT EXISTS files (
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
        error_message TEXT,
        dataset TEXT NOT NULL DEFAULT 'admin'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_files_file_id ON files(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_files_upload_id ON files(upload_id)`,
      `CREATE INDEX IF NOT EXISTS idx_files_status ON files(file_status)`,
      `CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted)`,
      `CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum)`,
      `CREATE INDEX IF NOT EXISTS idx_files_source ON files(source)`,

      `CREATE TABLE IF NOT EXISTS chunks (
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
        chunk_method TEXT,
        tier TEXT DEFAULT 'standard',
        parent_id TEXT DEFAULT NULL,
        dataset TEXT NOT NULL DEFAULT 'admin'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_section_number ON chunks(section_number)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_priority ON chunks(priority_level)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_content_hash ON chunks(content_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON chunks(chunk_index)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_tier ON chunks(tier)`,
      `CREATE INDEX IF NOT EXISTS idx_chunks_parent_id ON chunks(parent_id)`,

      `CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        chunk_id UNINDEXED,
        file_id UNINDEXED,
        section,
        topic,
        content,
        tags,
        tokenize='unicode61 remove_diacritics 1'
      )`,

      `CREATE TRIGGER IF NOT EXISTS trg_chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunks_fts(rowid, chunk_id, file_id, section, topic, content, tags)
        VALUES (new.rowid, new.chunk_id, new.file_id, new.section, new.topic, new.content, new.tags);
      END`,

      `CREATE TRIGGER IF NOT EXISTS trg_chunks_ad AFTER DELETE ON chunks BEGIN
        DELETE FROM chunks_fts WHERE rowid = old.rowid;
      END`,

      `CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_threads_thread_id ON threads(thread_id)`,
      `CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at)`,

      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        context TEXT,
        token_usage TEXT,
        is_answered BOOLEAN NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_is_answered ON messages(is_answered)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,

      `CREATE TABLE IF NOT EXISTS message_traces (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        message TEXT,
        trace_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_message_traces_thread_id ON message_traces(thread_id)`,
      `CREATE INDEX IF NOT EXISTS idx_message_traces_user_id ON message_traces(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_message_traces_message_id ON message_traces(message_id)`,
      `CREATE INDEX IF NOT EXISTS idx_message_traces_created_at ON message_traces(created_at)`,

      `CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        company_name TEXT NOT NULL DEFAULT 'Enterprise Assistant',
        assistant_name TEXT NOT NULL DEFAULT 'AI Assistant',
        domain_hint TEXT NOT NULL DEFAULT 'Official customer support and knowledge assistant for the organization.',
        brand_tone TEXT NOT NULL DEFAULT 'professional, helpful, and concise',
        primary_language TEXT NOT NULL DEFAULT 'english',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fallback_schedule TEXT DEFAULT 'weekly',
        dataset_admin_enabled INTEGER NOT NULL DEFAULT 1,
        dataset_admin_weight REAL NOT NULL DEFAULT 1.25,
        dataset_pdf_enabled INTEGER NOT NULL DEFAULT 1,
        dataset_pdf_weight REAL NOT NULL DEFAULT 1.10,
        dataset_web_enabled INTEGER NOT NULL DEFAULT 1,
        dataset_web_weight REAL NOT NULL DEFAULT 1.00
      )`,

      `INSERT OR IGNORE INTO system_settings (id, company_name, assistant_name, domain_hint, brand_tone, primary_language)
       VALUES ('default', 'AI Assistant', 'AI Assistant', 'Official customer support and knowledge assistant.', 'professional, helpful, and concise', 'english')`,

      `CREATE TABLE IF NOT EXISTS fallback_queries (
        id TEXT PRIMARY KEY,
        thread_id TEXT,
        user_id TEXT,
        query_text TEXT NOT NULL,
        reason TEXT,
        cluster_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fallback_queries_created_at ON fallback_queries(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_fallback_queries_cluster_id ON fallback_queries(cluster_id)`,

      `CREATE TABLE IF NOT EXISTS fallback_clusters (
        id TEXT PRIMARY KEY,
        cluster_name TEXT NOT NULL,
        summary TEXT,
        query_count INTEGER NOT NULL DEFAULT 0,
        sample_queries TEXT NOT NULL,
        suggested_action TEXT,
        is_new_category INTEGER DEFAULT 0,
        suggested_category_name TEXT,
        frequency_period TEXT DEFAULT 'weekly',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fallback_clusters_period ON fallback_clusters(frequency_period)`,
      `CREATE INDEX IF NOT EXISTS idx_fallback_clusters_created_at ON fallback_clusters(created_at)`,

      `CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        action TEXT,
        file_name TEXT,
        chunk_id TEXT,
        notes TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_file_name ON logs(file_name)`,
      `CREATE INDEX IF NOT EXISTS idx_logs_chunk_id ON logs(chunk_id)`,

      `CREATE TABLE IF NOT EXISTS ingest_jobs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        total_files INTEGER NOT NULL DEFAULT 0,
        processed_files INTEGER NOT NULL DEFAULT 0,
        failed_files INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        finished_at TEXT,
        error_message TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status ON ingest_jobs(status)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_jobs_source ON ingest_jobs(source)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_jobs_started_at ON ingest_jobs(started_at)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_jobs_finished_at ON ingest_jobs(finished_at)`,

      `CREATE TABLE IF NOT EXISTS ingest_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        file_id TEXT,
        level TEXT,
        message TEXT,
        at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_events_job_id ON ingest_events(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_events_file_id ON ingest_events(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_events_level ON ingest_events(level)`,
      `CREATE INDEX IF NOT EXISTS idx_ingest_events_at ON ingest_events(at)`,

      `CREATE TABLE IF NOT EXISTS upload_progress (
        upload_id TEXT PRIMARY KEY,
        file_name TEXT,
        total_batches INTEGER,
        completed_batches INTEGER,
        status TEXT,
        error TEXT,
        steps TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_upload_progress_status ON upload_progress(status)`,
      `CREATE INDEX IF NOT EXISTS idx_upload_progress_file_name ON upload_progress(file_name)`,

      `CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        tier TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        token_count INTEGER,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks_fts USING fts5(
        id UNINDEXED,
        document_id UNINDEXED,
        tier UNINDEXED,
        content,
        category,
        tokenize='unicode61 remove_diacritics 1'
      )`,

      `CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ai AFTER INSERT ON document_chunks BEGIN
        INSERT INTO document_chunks_fts(id, document_id, tier, content, category)
        VALUES (new.id, new.document_id, new.tier, new.content, new.category);
      END`,

      `CREATE TRIGGER IF NOT EXISTS trg_document_chunks_ad AFTER DELETE ON document_chunks BEGIN
        DELETE FROM document_chunks_fts WHERE id = old.id;
      END`,

      `CREATE TRIGGER IF NOT EXISTS trg_document_chunks_au AFTER UPDATE ON document_chunks BEGIN
        UPDATE document_chunks_fts
        SET content = new.content, category = new.category
        WHERE id = old.id;
      END`
    ];
  }
};
