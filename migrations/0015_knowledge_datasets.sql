-- Migration: 0015_knowledge_datasets.sql
-- Add dataset enable/disable toggles and priority weights to system_settings

-- 1. Extend system_settings with dataset columns
ALTER TABLE system_settings ADD COLUMN dataset_admin_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE system_settings ADD COLUMN dataset_admin_weight REAL NOT NULL DEFAULT 1.25;
ALTER TABLE system_settings ADD COLUMN dataset_pdf_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE system_settings ADD COLUMN dataset_pdf_weight REAL NOT NULL DEFAULT 1.10;
ALTER TABLE system_settings ADD COLUMN dataset_web_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE system_settings ADD COLUMN dataset_web_weight REAL NOT NULL DEFAULT 1.00;

-- 2. Add dataset column to files table
ALTER TABLE files ADD COLUMN dataset TEXT NOT NULL DEFAULT 'admin';

-- 3. Add dataset column to chunks table
ALTER TABLE chunks ADD COLUMN dataset TEXT NOT NULL DEFAULT 'admin';

-- 4. Backfill existing web crawled files and chunks
UPDATE files SET dataset = 'web' WHERE file_id LIKE 'web_%' OR file_path LIKE 'http%' OR source = 'web';
UPDATE chunks SET dataset = 'web' WHERE file_id IN (SELECT file_id FROM files WHERE dataset = 'web') OR source = 'web';
