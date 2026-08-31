import { D1Database } from '@cloudflare/workers-types';

export interface ClientResources {
  client_id: string;
  d1_database_id: string;
  d1_database_name: string;
  kv_namespace_id: string;
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

export const clientResourcesDb = {
  async getResources(db: D1Database, clientId: string): Promise<ClientResources | null> {
    const query = `SELECT * FROM client_resources WHERE client_id = ?`;
    return await db.prepare(query).bind(clientId).first<ClientResources>();
  },

  async saveResources(db: D1Database, clientId: string, resources: Partial<ClientResources>): Promise<void> {
    const existing = await this.getResources(db, clientId);
    if (existing) {
      const updates: string[] = [];
      const values: any[] = [];
      for (const [key, value] of Object.entries(resources)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
      values.push(clientId);
      const query = `UPDATE client_resources SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?`;
      await db.prepare(query).bind(...values).run();
    } else {
      const cols = ['client_id', ...Object.keys(resources)];
      const placeholders = cols.map(() => '?').join(', ');
      const values = [clientId, ...Object.values(resources)];
      const query = `INSERT INTO client_resources (${cols.join(', ')}) VALUES (${placeholders})`;
      await db.prepare(query).bind(...values).run();
    }
  },

  async updateStatus(db: D1Database, clientId: string, status: string, error?: string): Promise<void> {
    let query = `UPDATE client_resources SET provisioning_status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [status];
    if (error !== undefined) {
      query += `, provisioning_error = ?`;
      params.push(error);
    }
    if (status === 'ready') {
      query += `, provisioned_at = CURRENT_TIMESTAMP`;
    }
    query += ` WHERE client_id = ?`;
    params.push(clientId);
    await db.prepare(query).bind(...params).run();
  },

  async deleteResources(db: D1Database, clientId: string): Promise<void> {
    const query = `DELETE FROM client_resources WHERE client_id = ?`;
    await db.prepare(query).bind(clientId).run();
  }
};
