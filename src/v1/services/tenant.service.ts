// src/v1/services/tenant.service.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import { clientsDb, type ClientRecord } from "./db/clients.db";
import { clientSecretsDb } from "./db/client-secrets.db";
import { SettingsDbService, type SystemSettings, DEFAULT_SETTINGS } from "./db/settings.db";
import { getJwtSecret, getOpenAIKey } from "../utils/keys";

export interface ResolvedTenantContext {
  clientId: string;
  client: ClientRecord | null;
  settings: SystemSettings;
  openaiApiKey: string;
  cfAccountId: string;
  cfApiToken: string;
  isByok: boolean;
}

export const tenantService = {
  /**
   * Resolves the full runtime tenant context: client details, settings, and active API keys.
   */
  async resolveContext(c: Context<Env>, explicitClientId?: string): Promise<ResolvedTenantContext> {
    const db = c.env.DB;
    const clientId = explicitClientId || (c as any).get("clientId") || "default";
    const masterKey = getJwtSecret(c.env);

    // 1. Fetch Client Record
    let client = (c as any).get("client") as ClientRecord | null;
    if (!client || client.id !== clientId) {
      client = await clientsDb.getClientById(db, clientId);
    }

    // 2. Fetch Tenant Settings
    const settingsDb = new SettingsDbService();
    const settings = await settingsDb.getSettings(db, clientId);

    // 3. Resolve API Keys (BYOK vs Platform)
    let openaiApiKey = getOpenAIKey(c.env);
    let cfAccountId = c.env.CF_ACCOUNT_ID || "";
    let cfApiToken = (c.env as any).CF_AI_SEARCH_TOKEN || "";
    let isByok = false;

    if (client && client.billing_mode === "byok") {
      const secrets = await clientSecretsDb.getDecryptedSecrets(db, clientId, masterKey);
      if (secrets.has_openai_key && secrets.openai_api_key) {
        openaiApiKey = secrets.openai_api_key;
        isByok = true;
      }
      if (secrets.cf_account_id) cfAccountId = secrets.cf_account_id;
      if (secrets.has_cf_token && secrets.cf_api_token) cfApiToken = secrets.cf_api_token;
    }

    return {
      clientId,
      client,
      settings: settings || DEFAULT_SETTINGS,
      openaiApiKey,
      cfAccountId,
      cfApiToken,
      isByok,
    };
  },
};
