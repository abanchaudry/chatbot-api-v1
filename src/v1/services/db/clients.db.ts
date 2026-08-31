// src/v1/services/db/clients.db.ts
import type { D1Database } from "@cloudflare/workers-types";

export interface ClientRecord {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  contact_email?: string | null;
  logo_url?: string | null;
  billing_mode: "platform" | "byok";
  public_token: string;
  status: "active" | "suspended";
  created_at?: string;
  updated_at?: string;
}

export interface ClientWithStats extends ClientRecord {
  total_chunks?: number;
  total_threads?: number;
  total_files?: number;
  admin_count?: number;
}

export const clientsDb = {
  async getAllClients(db: D1Database): Promise<ClientWithStats[]> {
    try {
      const query = `
        SELECT 
          c.id, c.name, c.slug, c.domain, c.contact_email, c.logo_url, c.billing_mode, c.public_token, c.status, c.created_at, c.updated_at,
          (SELECT COUNT(*) FROM chunks WHERE client_id = c.id) AS total_chunks,
          (SELECT COUNT(*) FROM threads WHERE client_id = c.id) AS total_threads,
          (SELECT COUNT(*) FROM files WHERE client_id = c.id AND is_deleted = 0) AS total_files,
          (SELECT COUNT(*) FROM auth WHERE client_id = c.id) AS admin_count
        FROM clients c
        ORDER BY c.created_at DESC
      `;
      const result = await db.prepare(query).all<ClientWithStats>();
      return result.results || [];
    } catch (err: any) {
      console.error("clientsDb.getAllClients error:", err?.message || err);
      return [];
    }
  },

  async getClientById(db: D1Database, id: string): Promise<ClientRecord | null> {
    try {
      const row = await db
        .prepare("SELECT * FROM clients WHERE id = ? LIMIT 1")
        .bind(id)
        .first<ClientRecord>();
      return row || null;
    } catch (err: any) {
      console.error("clientsDb.getClientById error:", err?.message || err);
      return null;
    }
  },

  async getClientBySlug(db: D1Database, slug: string): Promise<ClientRecord | null> {
    try {
      const row = await db
        .prepare("SELECT * FROM clients WHERE slug = ? LIMIT 1")
        .bind(slug.toLowerCase().trim())
        .first<ClientRecord>();
      return row || null;
    } catch (err: any) {
      console.error("clientsDb.getClientBySlug error:", err?.message || err);
      return null;
    }
  },

  async getClientByPublicToken(db: D1Database, token: string): Promise<ClientRecord | null> {
    try {
      const row = await db
        .prepare("SELECT * FROM clients WHERE public_token = ? LIMIT 1")
        .bind(token.trim())
        .first<ClientRecord>();
      return row || null;
    } catch (err: any) {
      console.error("clientsDb.getClientByPublicToken error:", err?.message || err);
      return null;
    }
  },

  async createClient(
    db: D1Database,
    client: {
      id: string;
      name: string;
      slug: string;
      domain?: string;
      contact_email?: string;
      logo_url?: string;
      billing_mode: "platform" | "byok";
      public_token: string;
      status?: "active" | "suspended";
    }
  ): Promise<ClientRecord> {
    const status = client.status || "active";
    await db
      .prepare(
        `INSERT INTO clients (id, name, slug, domain, contact_email, logo_url, billing_mode, public_token, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .bind(
        client.id,
        client.name.trim(),
        client.slug.toLowerCase().trim(),
        client.domain?.trim() || null,
        client.contact_email?.trim() || null,
        client.logo_url?.trim() || null,
        client.billing_mode,
        client.public_token,
        status
      )
      .run();

    // Auto-create default system_settings for this new tenant
    await db
      .prepare(
        `INSERT OR IGNORE INTO system_settings (id, company_name, assistant_name, domain_hint, brand_tone, primary_language, client_id)
         VALUES (?, ?, 'AI Assistant', 'Official customer support assistant.', 'professional, helpful, and concise', 'english', ?)`
      )
      .bind(`settings_${client.id}`, client.name, client.id)
      .run();

    const created = await this.getClientById(db, client.id);
    if (!created) throw new Error("Failed to retrieve created client record");
    return created;
  },

  async updateClient(
    db: D1Database,
    id: string,
    updates: Partial<ClientRecord>
  ): Promise<ClientRecord | null> {
    const current = await this.getClientById(db, id);
    if (!current) return null;

    const name = updates.name !== undefined ? updates.name.trim() : current.name;
    const slug = updates.slug !== undefined ? updates.slug.toLowerCase().trim() : current.slug;
    const domain = updates.domain !== undefined ? updates.domain?.trim() || null : current.domain;
    const contactEmail = updates.contact_email !== undefined ? updates.contact_email?.trim() || null : current.contact_email;
    const logoUrl = updates.logo_url !== undefined ? updates.logo_url?.trim() || null : current.logo_url;
    const billingMode = updates.billing_mode !== undefined ? updates.billing_mode : current.billing_mode;
    const status = updates.status !== undefined ? updates.status : current.status;

    await db
      .prepare(
        `UPDATE clients
         SET name = ?, slug = ?, domain = ?, contact_email = ?, logo_url = ?, billing_mode = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(name, slug, domain, contactEmail, logoUrl, billingMode, status, id)
      .run();

    return this.getClientById(db, id);
  },

  async deleteClient(db: D1Database, id: string): Promise<boolean> {
    try {
      // 1. Delete child records first to satisfy Foreign Key constraints
      await db.prepare("DELETE FROM api_key_requests WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM client_resources WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM auth WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM client_secrets WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM system_settings WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM chunks WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM files WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM messages WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM threads WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM logs WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM message_traces WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM ingest_events WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM ingest_jobs WHERE client_id = ?").bind(id).run().catch(() => {});
      await db.prepare("DELETE FROM upload_progress WHERE client_id = ?").bind(id).run().catch(() => {});

      // 2. Delete parent client record last
      await db.prepare("DELETE FROM clients WHERE id = ?").bind(id).run();
      return true;
    } catch (err: any) {
      console.error("clientsDb.deleteClient error:", err?.message || err);
      return false;
    }
  },

  async getPlatformStats(db: D1Database) {
    try {
      const totalClientsRow = await db.prepare("SELECT COUNT(*) AS count FROM clients").first<{ count: number }>();
      const activeClientsRow = await db.prepare("SELECT COUNT(*) AS count FROM clients WHERE status = 'active'").first<{ count: number }>();
      const byokClientsRow = await db.prepare("SELECT COUNT(*) AS count FROM clients WHERE billing_mode = 'byok'").first<{ count: number }>();
      const platformClientsRow = await db.prepare("SELECT COUNT(*) AS count FROM clients WHERE billing_mode = 'platform'").first<{ count: number }>();

      const totalThreadsRow = await db.prepare("SELECT COUNT(*) AS count FROM threads").first<{ count: number }>().catch(() => ({ count: 0 }));
      const totalMessagesRow = await db.prepare("SELECT COUNT(*) AS count FROM messages").first<{ count: number }>().catch(() => ({ count: 0 }));
      const totalChunksRow = await db.prepare("SELECT COUNT(*) AS count FROM chunks").first<{ count: number }>().catch(() => ({ count: 0 }));
      const totalFilesRow = await db.prepare("SELECT COUNT(*) AS count FROM files WHERE is_deleted = 0").first<{ count: number }>().catch(() => ({ count: 0 }));

      return {
        total_clients: totalClientsRow?.count || 0,
        active_clients: activeClientsRow?.count || 0,
        byok_clients: byokClientsRow?.count || 0,
        platform_clients: platformClientsRow?.count || 0,
        total_threads: totalThreadsRow?.count || 0,
        total_messages: totalMessagesRow?.count || 0,
        total_chunks: totalChunksRow?.count || 0,
        total_files: totalFilesRow?.count || 0,
      };
    } catch (err: any) {
      console.error("clientsDb.getPlatformStats error:", err?.message || err);
      return {
        total_clients: 0,
        active_clients: 0,
        byok_clients: 0,
        platform_clients: 0,
        total_threads: 0,
        total_messages: 0,
        total_chunks: 0,
        total_files: 0,
      };
    }
  },
};
