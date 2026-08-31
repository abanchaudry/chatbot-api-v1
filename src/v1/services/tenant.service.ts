// src/v1/services/tenant.service.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import { clientsDb, type ClientRecord } from "./db/clients.db";
import { clientSecretsDb } from "./db/client-secrets.db";
import { clientResourcesDb, type ClientResources } from "./db/client-resources.db";
import { SettingsDbService, type SystemSettings, DEFAULT_SETTINGS } from "./db/settings.db";
import { getJwtSecret, getOpenAIKey } from "../utils/keys";
import { createKVRestClient, type KVRestClient } from "./cloudflare-kv-rest.service";

export interface ResolvedTenantContext {
  clientId: string;
  client: ClientRecord | null;
  resources: ClientResources | null;
  settings: SystemSettings;
  openaiApiKey: string;
  cfAccountId: string;
  cfApiToken: string;
  isByok: boolean; // True if client is using their own OpenAI API key
  kvCache: any; // Native KV binding or REST KV client for tenant's dedicated namespace
}

export const tenantService = {
  /**
   * Resolves the full runtime tenant context: client details, settings, provisioned resources, and active API keys.
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

    // 2. Fetch Tenant Dedicated Resources
    let resources: ClientResources | null = null;
    if (clientId !== "default") {
      resources = await clientResourcesDb.getResources(db, clientId);
    }

    // 3. Fetch Tenant Settings
    const settingsDb = new SettingsDbService();
    const settings = await settingsDb.getSettings(db, clientId);

    // 4. Resolve API Keys
    let openaiApiKey = getOpenAIKey(c.env);
    const cfAccountId = c.env.CF_ACCOUNT_ID || "";
    const cfApiToken = (c.env as any).CF_PLATFORM_API_TOKEN || (c.env as any).CF_AI_SEARCH_TOKEN || "";
    let isByok = false;

    if (client && client.billing_mode === "byok") {
      const secrets = await clientSecretsDb.getDecryptedSecrets(db, clientId, masterKey);
      if (secrets.has_openai_key && secrets.openai_api_key) {
        openaiApiKey = secrets.openai_api_key;
        isByok = true;
      }
    }

    // 5. Resolve KV Cache client (Dedicated KV namespace via REST or platform default native binding)
    let kvCache: any = c.env.CACHE;
    if (resources?.kv_namespace_id && cfAccountId && cfApiToken) {
      kvCache = createKVRestClient(cfAccountId, cfApiToken, resources.kv_namespace_id);
    }

    return {
      clientId,
      client,
      resources,
      settings: settings || DEFAULT_SETTINGS,
      openaiApiKey,
      cfAccountId,
      cfApiToken,
      isByok,
      kvCache,
    };
  },
};
