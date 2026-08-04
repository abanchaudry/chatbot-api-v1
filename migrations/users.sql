-- migrations/000X_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
