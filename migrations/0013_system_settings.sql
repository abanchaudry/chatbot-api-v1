CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'Enterprise Assistant',
  assistant_name TEXT NOT NULL DEFAULT 'C',
  domain_hint TEXT NOT NULL DEFAULT 'Official customer support and knowledge assistant for the organization.',
  brand_tone TEXT NOT NULL DEFAULT 'professional, helpful, and concise',
  primary_language TEXT NOT NULL DEFAULT 'english',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO system_settings (id, company_name, assistant_name, domain_hint, brand_tone, primary_language)
VALUES ('default', 'Nevada State Contractors Board', 'C', 'Nevada Revised Statutes (NRS Chapter 624) and Nevada Administrative Code (NAC Chapter 624) regulations governing contractor licensing, bond requirements, fees, classification, and consumer protection.', 'professional, calm, and customer-friendly', 'english');
