-- migrations/000X_create_message_traces_table.sql
CREATE TABLE IF NOT EXISTS message_traces (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  message TEXT,
  trace_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_message_traces_thread_id ON message_traces(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_traces_user_id ON message_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_message_traces_message_id ON message_traces(message_id);
CREATE INDEX IF NOT EXISTS idx_message_traces_created_at ON message_traces(created_at);
