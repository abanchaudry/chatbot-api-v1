import type { D1Database } from "@cloudflare/workers-types";

export interface SystemSettings {
  id: string;
  company_name: string;
  assistant_name: string;
  domain_hint: string;
  brand_tone: string;
  primary_language: string;
  fallback_schedule?: 'daily' | 'weekly' | 'monthly';
  updated_at?: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  id: "default",
  company_name: "Enterprise Assistant",
  assistant_name: "C",
  domain_hint: "Official customer support and knowledge base assistant.",
  brand_tone: "professional, calm, and customer-friendly",
  primary_language: "english",
  fallback_schedule: "weekly",
};

export class SettingsDbService {
  async getSettings(db: D1Database): Promise<SystemSettings> {
    try {
      const row = await db
        .prepare("SELECT id, company_name, assistant_name, domain_hint, brand_tone, primary_language, fallback_schedule, updated_at FROM system_settings WHERE id = 'default' LIMIT 1")
        .first<SystemSettings>();

      return row ? { ...DEFAULT_SETTINGS, ...row } : DEFAULT_SETTINGS;
    } catch (err: any) {
      console.warn("SettingsDbService.getSettings warning:", err?.message || err);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(db: D1Database, settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const company = String(settings.company_name || DEFAULT_SETTINGS.company_name).trim();
    const assistant = String(settings.assistant_name || DEFAULT_SETTINGS.assistant_name).trim();
    const domain = String(settings.domain_hint || DEFAULT_SETTINGS.domain_hint).trim();
    const tone = String(settings.brand_tone || DEFAULT_SETTINGS.brand_tone).trim();
    const lang = String(settings.primary_language || DEFAULT_SETTINGS.primary_language).trim();
    const schedule = String(settings.fallback_schedule || DEFAULT_SETTINGS.fallback_schedule).trim();

    await db
      .prepare(
        `INSERT INTO system_settings (id, company_name, assistant_name, domain_hint, brand_tone, primary_language, fallback_schedule, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           company_name = excluded.company_name,
           assistant_name = excluded.assistant_name,
           domain_hint = excluded.domain_hint,
           brand_tone = excluded.brand_tone,
           primary_language = excluded.primary_language,
           fallback_schedule = excluded.fallback_schedule,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(company, assistant, domain, tone, lang, schedule)
      .run();

    return this.getSettings(db);
  }
}
