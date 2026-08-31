// src/v1/services/db/api-key-requests.db.ts
import type { D1Database } from "@cloudflare/workers-types";

export interface ApiKeyRequestRecord {
  id: string;
  client_id: string;
  request_type: "switch_to_own" | "switch_to_platform";
  status: "pending" | "approved" | "rejected";
  requested_by?: number | null;
  reviewed_by?: number | null;
  notes?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  // Joined fields
  client_name?: string;
  client_slug?: string;
}

export const apiKeyRequestsDb = {
  async createRequest(
    db: D1Database,
    request: {
      client_id: string;
      request_type: "switch_to_own" | "switch_to_platform";
      requested_by?: number | null;
      notes?: string;
    }
  ): Promise<ApiKeyRequestRecord> {
    const id = `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO api_key_requests (id, client_id, request_type, status, requested_by, notes, created_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`
      )
      .bind(id, request.client_id, request.request_type, request.requested_by || null, request.notes || null, now)
      .run();

    return {
      id,
      client_id: request.client_id,
      request_type: request.request_type,
      status: "pending",
      requested_by: request.requested_by,
      notes: request.notes,
      created_at: now,
    };
  },

  async getAllRequests(db: D1Database, status?: string): Promise<ApiKeyRequestRecord[]> {
    let sql = `
      SELECT r.*, c.name AS client_name, c.slug AS client_slug
      FROM api_key_requests r
      LEFT JOIN clients c ON r.client_id = c.id
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE r.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC`;

    const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
    const { results } = await stmt.all<ApiKeyRequestRecord>();
    return results || [];
  },

  async getRequestsByClientId(db: D1Database, clientId: string): Promise<ApiKeyRequestRecord[]> {
    const sql = `
      SELECT r.*, c.name AS client_name, c.slug AS client_slug
      FROM api_key_requests r
      LEFT JOIN clients c ON r.client_id = c.id
      WHERE r.client_id = ?
      ORDER BY r.created_at DESC
    `;
    const { results } = await db.prepare(sql).bind(clientId).all<ApiKeyRequestRecord>();
    return results || [];
  },

  async getPendingRequestForClient(db: D1Database, clientId: string): Promise<ApiKeyRequestRecord | null> {
    const sql = `
      SELECT * FROM api_key_requests
      WHERE client_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const row = await db.prepare(sql).bind(clientId).first<ApiKeyRequestRecord>();
    return row || null;
  },

  async reviewRequest(
    db: D1Database,
    requestId: string,
    review: {
      status: "approved" | "rejected";
      reviewed_by?: number | null;
      notes?: string;
    }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await db
      .prepare(
        `UPDATE api_key_requests
         SET status = ?, reviewed_by = ?, notes = COALESCE(?, notes), reviewed_at = ?
         WHERE id = ?`
      )
      .bind(review.status, review.reviewed_by || null, review.notes || null, now, requestId)
      .run();

    return Boolean(result?.success);
  },

  async getRequestById(db: D1Database, requestId: string): Promise<ApiKeyRequestRecord | null> {
    const sql = `
      SELECT r.*, c.name AS client_name, c.slug AS client_slug
      FROM api_key_requests r
      LEFT JOIN clients c ON r.client_id = c.id
      WHERE r.id = ?
      LIMIT 1
    `;
    return await db.prepare(sql).bind(requestId).first<ApiKeyRequestRecord>();
  },
};
