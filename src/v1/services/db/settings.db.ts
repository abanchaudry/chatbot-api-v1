import type { D1Database } from "@cloudflare/workers-types";

export interface SystemSettings {
  id: string;
  company_name: string;
  assistant_name: string;
  domain_hint: string;
  brand_tone: string;
  primary_language: string;
  fallback_schedule?: 'daily' | 'weekly' | 'monthly';
  dataset_admin_enabled?: number;
  dataset_admin_weight?: number;
  dataset_pdf_enabled?: number;
  dataset_pdf_weight?: number;
  dataset_web_enabled?: number;
  dataset_web_weight?: number;
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
  dataset_admin_enabled: 1,
  dataset_admin_weight: 1.25,
  dataset_pdf_enabled: 1,
  dataset_pdf_weight: 1.10,
  dataset_web_enabled: 1,
  dataset_web_weight: 1.00,
};

export function getDatasetSignature(settings?: Partial<SystemSettings>): string {
  const a = settings?.dataset_admin_enabled !== undefined ? Number(settings.dataset_admin_enabled) : (DEFAULT_SETTINGS.dataset_admin_enabled ?? 1);
  const p = settings?.dataset_pdf_enabled !== undefined ? Number(settings.dataset_pdf_enabled) : (DEFAULT_SETTINGS.dataset_pdf_enabled ?? 1);
  const w = settings?.dataset_web_enabled !== undefined ? Number(settings.dataset_web_enabled) : (DEFAULT_SETTINGS.dataset_web_enabled ?? 1);
  const aw = Math.round((settings?.dataset_admin_weight !== undefined ? Number(settings.dataset_admin_weight) : 1.25) * 100);
  const pw = Math.round((settings?.dataset_pdf_weight !== undefined ? Number(settings.dataset_pdf_weight) : 1.10) * 100);
  const ww = Math.round((settings?.dataset_web_weight !== undefined ? Number(settings.dataset_web_weight) : 1.00) * 100);
  return `a${a}_${aw}_p${p}_${pw}_w${w}_${ww}`;
}

export class SettingsDbService {
  async getSettings(db: D1Database): Promise<SystemSettings> {
    try {
      const row = await db
        .prepare("SELECT id, company_name, assistant_name, domain_hint, brand_tone, primary_language, fallback_schedule, dataset_admin_enabled, dataset_admin_weight, dataset_pdf_enabled, dataset_pdf_weight, dataset_web_enabled, dataset_web_weight, updated_at FROM system_settings WHERE id = 'default' LIMIT 1")
        .first<SystemSettings>();

      return row ? { ...DEFAULT_SETTINGS, ...row } : DEFAULT_SETTINGS;
    } catch (err: any) {
      console.warn("SettingsDbService.getSettings warning:", err?.message || err);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(db: D1Database, settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings(db);
    const company = String(settings.company_name !== undefined ? settings.company_name : current.company_name).trim();
    const assistant = String(settings.assistant_name !== undefined ? settings.assistant_name : current.assistant_name).trim();
    const domain = String(settings.domain_hint !== undefined ? settings.domain_hint : current.domain_hint).trim();
    const tone = String(settings.brand_tone !== undefined ? settings.brand_tone : current.brand_tone).trim();
    const lang = String(settings.primary_language !== undefined ? settings.primary_language : current.primary_language).trim();
    const schedule = String(settings.fallback_schedule !== undefined ? settings.fallback_schedule : current.fallback_schedule).trim();
    const adminEnabled = settings.dataset_admin_enabled !== undefined ? Number(settings.dataset_admin_enabled) : (current.dataset_admin_enabled ?? 1);
    const adminWeight = settings.dataset_admin_weight !== undefined ? Number(settings.dataset_admin_weight) : (current.dataset_admin_weight ?? 1.25);
    const pdfEnabled = settings.dataset_pdf_enabled !== undefined ? Number(settings.dataset_pdf_enabled) : (current.dataset_pdf_enabled ?? 1);
    const pdfWeight = settings.dataset_pdf_weight !== undefined ? Number(settings.dataset_pdf_weight) : (current.dataset_pdf_weight ?? 1.10);
    const webEnabled = settings.dataset_web_enabled !== undefined ? Number(settings.dataset_web_enabled) : (current.dataset_web_enabled ?? 1);
    const webWeight = settings.dataset_web_weight !== undefined ? Number(settings.dataset_web_weight) : (current.dataset_web_weight ?? 1.00);

    await db
      .prepare(
        `INSERT INTO system_settings (id, company_name, assistant_name, domain_hint, brand_tone, primary_language, fallback_schedule, dataset_admin_enabled, dataset_admin_weight, dataset_pdf_enabled, dataset_pdf_weight, dataset_web_enabled, dataset_web_weight, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           company_name = excluded.company_name,
           assistant_name = excluded.assistant_name,
           domain_hint = excluded.domain_hint,
           brand_tone = excluded.brand_tone,
           primary_language = excluded.primary_language,
           fallback_schedule = excluded.fallback_schedule,
           dataset_admin_enabled = excluded.dataset_admin_enabled,
           dataset_admin_weight = excluded.dataset_admin_weight,
           dataset_pdf_enabled = excluded.dataset_pdf_enabled,
           dataset_pdf_weight = excluded.dataset_pdf_weight,
           dataset_web_enabled = excluded.dataset_web_enabled,
           dataset_web_weight = excluded.dataset_web_weight,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(company, assistant, domain, tone, lang, schedule, adminEnabled, adminWeight, pdfEnabled, pdfWeight, webEnabled, webWeight)
      .run();

    return this.getSettings(db);
  }
}
