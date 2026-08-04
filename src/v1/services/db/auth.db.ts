export const authdb = {
  // Get a user by username
  async getUserByUsername(db: D1Database, username: string): Promise<any | null> {
    const result = await db.prepare('SELECT * FROM auth WHERE username = ?').bind(username).first();
    return result || null;
  },

  // Save a new user (signup)
  async saveUser(db: D1Database, username: string, password: string): Promise<void> {
    await db.prepare(`
      INSERT INTO auth (username, password, created_at) 
      VALUES (?, ?, datetime())
    `).bind(username, password).run();
  },

  // Get user by ID
  async getUserById(db: D1Database, userId: string): Promise<any | null> {
    const result = await db.prepare(`
      SELECT id, username, created_at 
      FROM auth 
      WHERE id = ?
    `).bind(userId).first();
    return result || null;
  },

  // Get all users
  async getAllAuthUsers(db: D1Database): Promise<any | null> {
    const result = await db.prepare(`
      SELECT *
      FROM auth 
    `).all();
    return result || null;
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
