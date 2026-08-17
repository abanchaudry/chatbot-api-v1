import type { D1Database } from "@cloudflare/workers-types";

export interface AuthUser {
  id: string | number;
  username: string;
  password?: string;
  created_at: string;
  last_login?: string | null;
}

export interface SafeAuthUser {
  id: string | number;
  username: string;
  created_at: string;
  last_login?: string | null;
}

export const authdb = {
  // Get a user by username
  async getUserByUsername(db: D1Database, username: string): Promise<AuthUser | null> {
    const result = await db.prepare('SELECT * FROM auth WHERE username = ?').bind(username).first();
    return (result as unknown as AuthUser) || null;
  },

  // Save a new user (signup)
  async saveUser(db: D1Database, username: string, password: string): Promise<void> {
    await db.prepare(`
      INSERT INTO auth (username, password, created_at) 
      VALUES (?, ?, datetime())
    `).bind(username, password).run();
  },

  // Get user by ID
  async getUserById(db: D1Database, userId: string): Promise<SafeAuthUser | null> {
    const result = await db.prepare(`
      SELECT id, username, created_at, last_login 
      FROM auth 
      WHERE id = ?
    `).bind(userId).first();
    return (result as unknown as SafeAuthUser) || null;
  },

  // Get all users (omits password hash)
  async getAllAuthUsers(db: D1Database): Promise<SafeAuthUser[]> {
    const result = await db.prepare(`
      SELECT id, username, created_at, last_login
      FROM auth 
      ORDER BY created_at DESC
    `).all();
    return (result.results as unknown as SafeAuthUser[]) || [];
  },

  // Update last login timestamp
  async updateLastLogin(db: D1Database, username: string): Promise<void> {
    await db.prepare(`
      UPDATE auth
      SET last_login = CURRENT_TIMESTAMP
      WHERE username = ?
    `).bind(username).run();
  },
};
