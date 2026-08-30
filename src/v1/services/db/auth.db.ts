import type { D1Database } from "@cloudflare/workers-types";

export interface AuthUser {
  id: string | number;
  username: string;
  password?: string;
  role: "super_admin" | "client_admin";
  client_id?: string | null;
  status: "active" | "suspended";
  created_at: string;
  last_login?: string | null;
}

export interface SafeAuthUser {
  id: string | number;
  username: string;
  role: "super_admin" | "client_admin";
  client_id?: string | null;
  client_name?: string | null;
  status: "active" | "suspended";
  created_at: string;
  last_login?: string | null;
}

export const authdb = {
  // Get a user by username
  async getUserByUsername(db: D1Database, username: string): Promise<AuthUser | null> {
    const result = await db
      .prepare("SELECT * FROM auth WHERE username = ? LIMIT 1")
      .bind(username.trim())
      .first<AuthUser>();
    return result || null;
  },

  // Save a new user (signup or super admin creation)
  async saveUser(
    db: D1Database,
    username: string,
    password: string,
    role: "super_admin" | "client_admin" = "client_admin",
    clientId: string | null = null
  ): Promise<void> {
    await db
      .prepare(
        `INSERT INTO auth (username, password, role, client_id, status, created_at)
         VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`
      )
      .bind(username.trim(), password, role, clientId)
      .run();
  },

  // Get user by ID
  async getUserById(db: D1Database, userId: string | number): Promise<SafeAuthUser | null> {
    const result = await db
      .prepare(
        `SELECT a.id, a.username, a.role, a.client_id, a.status, a.created_at, a.last_login, c.name AS client_name
         FROM auth a
         LEFT JOIN clients c ON a.client_id = c.id
         WHERE a.id = ? LIMIT 1`
      )
      .bind(userId)
      .first<SafeAuthUser>();
    return result || null;
  },

  // Get all users
  async getAllAuthUsers(db: D1Database): Promise<SafeAuthUser[]> {
    const result = await db
      .prepare(
        `SELECT a.id, a.username, a.role, a.client_id, a.status, a.created_at, a.last_login, c.name AS client_name
         FROM auth a
         LEFT JOIN clients c ON a.client_id = c.id
         ORDER BY a.created_at DESC`
      )
      .all<SafeAuthUser>();
    return result.results || [];
  },

  // Get users for a specific client
  async getUsersByClientId(db: D1Database, clientId: string): Promise<SafeAuthUser[]> {
    const result = await db
      .prepare(
        `SELECT a.id, a.username, a.role, a.client_id, a.status, a.created_at, a.last_login, c.name AS client_name
         FROM auth a
         LEFT JOIN clients c ON a.client_id = c.id
         WHERE a.client_id = ?
         ORDER BY a.created_at DESC`
      )
      .bind(clientId)
      .all<SafeAuthUser>();
    return result.results || [];
  },

  // Update last login timestamp
  async updateLastLogin(db: D1Database, username: string): Promise<void> {
    await db
      .prepare(`UPDATE auth SET last_login = CURRENT_TIMESTAMP WHERE username = ?`)
      .bind(username.trim())
      .run();
  },

  // Update password
  async updatePassword(db: D1Database, userId: string | number, passwordHash: string): Promise<void> {
    const idNum = typeof userId === "number" ? userId : parseInt(String(userId), 10);
    await db
      .prepare(`UPDATE auth SET password = ? WHERE id = ?`)
      .bind(passwordHash, idNum)
      .run();
  },

  // Delete user
  async deleteUser(db: D1Database, userId: string | number): Promise<void> {
    const idNum = typeof userId === "number" ? userId : parseInt(String(userId), 10);
    await db.prepare(`DELETE FROM auth WHERE id = ?`).bind(idNum).run();
  },
};
