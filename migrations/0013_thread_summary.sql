-- 0013_thread_summary.sql: Add rolling summary column to threads table
ALTER TABLE threads ADD COLUMN summary TEXT DEFAULT NULL;
