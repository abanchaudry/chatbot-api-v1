-- migrations/0019_add_client_contact_email.sql
-- Add contact_email column to clients table

ALTER TABLE clients ADD COLUMN contact_email TEXT;
