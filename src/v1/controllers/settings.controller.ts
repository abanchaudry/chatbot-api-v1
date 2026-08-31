import type { Context } from "hono";
import type { Env } from "../types/env";
import { SettingsDbService } from "../services/db/settings.db";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { getOpenAIKey, getJwtSecret } from "../utils/keys";
import { tenantService } from "../services/tenant.service";
import { clientsDb } from "../services/db/clients.db";
import { clientSecretsDb } from "../services/db/client-secrets.db";
import { apiKeyRequestsDb } from "../services/db/api-key-requests.db";

const domainGeneratorPrompt = PromptTemplate.fromTemplate(`
You are an expert AI prompt engineer specializing in enterprise RAG chatbots.

Your task is to take a company's raw business summary and transform it into a clear, comprehensive, and structured DOMAIN_HINT instruction string for an AI customer support bot.

Company Name: {companyName}
Raw Business Summary:
{rawDescription}

Format the output as a 2-3 paragraph domain scope specification covering:
1. What the company does, its core products/services, and customer base.
2. The specific topics, policies, FAQs, regulations, pricing, and procedures the AI is authorized to assist with.
3. Explicit boundaries specifying what is out of scope.

Output ONLY the final domain instruction text (no markdown intro, no JSON wrappers):
`);

export const settingsController = {
  getSettings: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const user = (c as any).get("user");
      const headerClient = c.req.header("x-client-id");
      const queryClient = c.req.query("clientId") || c.req.query("client_id");
      
      const clientId = (user?.role === "super_admin" && (headerClient || queryClient))
        ? (headerClient || queryClient)
        : (user?.clientId || (c as any).get("clientId") || "default");

      const settings = await new SettingsDbService().getSettings(db as any, clientId);
      return c.json({ ok: true, settings });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to fetch settings" }, 500);
    }
  },

  saveSettings: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const user = (c as any).get("user");
      const headerClient = c.req.header("x-client-id");
      const queryClient = c.req.query("clientId") || c.req.query("client_id");
      const body = await c.req.json();

      const clientId = (user?.role === "super_admin" && (body.client_id || headerClient || queryClient))
        ? (body.client_id || headerClient || queryClient)
        : (user?.clientId || (c as any).get("clientId") || "default");

      const settings = await new SettingsDbService().saveSettings(db as any, body, clientId);

      // Auto-purge all query cache entries when business settings change so old responses are never served
      if (c.env.CACHE) {
        const { purgeAllQueryCache } = await import("../services/cache.service");
        await purgeAllQueryCache(c.env.CACHE).catch(() => {});
      }

      return c.json({ ok: true, settings });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to save settings" }, 500);
    }
  },

  generateDomainPrompt: async (c: Context<Env>) => {
    try {
      const body = await c.req.json();
      const companyName = String(body.companyName || "Our Company").trim();
      const rawDescription = String(body.rawDescription || "").trim();

      if (!rawDescription) {
        return c.json({ ok: false, error: "rawDescription is required to generate domain prompt" }, 400);
      }

      const tenant = await tenantService.resolveContext(c);
      const apiKey = tenant.openaiApiKey || getOpenAIKey(c.env);
      if (!apiKey) {
        return c.json({ ok: false, error: "OPENAI_API_KEY is not configured" }, 500);
      }

      const model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.3,
      });

      const chain = domainGeneratorPrompt.pipe(model);
      const res = await chain.invoke({ companyName, rawDescription });
      const generatedDomainHint = String(res.content || "").trim();

      return c.json({
        ok: true,
        companyName,
        generatedDomainHint,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to generate domain prompt" }, 500);
    }
  },

  // GET /settings/api-key-status
  getApiKeyStatus: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const user = (c as any).get("user");
      const headerClient = c.req.header("x-client-id");
      const queryClient = c.req.query("clientId") || c.req.query("client_id");

      const clientId = (user?.role === "super_admin" && (headerClient || queryClient))
        ? (headerClient || queryClient)
        : (user?.clientId || (c as any).get("clientId") || "default");

      const client = await clientsDb.getClientById(db, clientId);
      const masterKey = getJwtSecret(c.env);
      const secrets = await clientSecretsDb.getDecryptedSecrets(db, clientId, masterKey);
      const pendingRequest = await apiKeyRequestsDb.getPendingRequestForClient(db, clientId);

      return c.json({
        ok: true,
        billing_mode: client?.billing_mode || "platform",
        has_openai_key: secrets.has_openai_key,
        openai_api_key_masked: secrets.openai_api_key_masked,
        has_pending_request: Boolean(pendingRequest),
        pending_request: pendingRequest,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to get API key status" }, 500);
    }
  },

  // POST /settings/openai-key
  updateOpenAIKey: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const user = (c as any).get("user");
      const headerClient = c.req.header("x-client-id");
      const queryClient = c.req.query("clientId") || c.req.query("client_id");
      const body = await c.req.json();
      const openaiApiKey = String(body.openai_api_key || "").trim();

      if (!openaiApiKey) {
        return c.json({ ok: false, error: "OpenAI API key is required" }, 400);
      }

      if (!openaiApiKey.startsWith("sk-")) {
        return c.json({ ok: false, error: "Invalid OpenAI API key format (should start with 'sk-')" }, 400);
      }

      const clientId = (user?.role === "super_admin" && (body.client_id || headerClient || queryClient))
        ? (body.client_id || headerClient || queryClient)
        : (user?.clientId || (c as any).get("clientId") || "default");

      const masterKey = getJwtSecret(c.env);

      // Save encrypted secret
      await clientSecretsDb.saveSecrets(db, clientId, { openai_api_key: openaiApiKey }, masterKey);

      // Switch client billing mode to BYOK
      await clientsDb.updateClient(db, clientId, { billing_mode: "byok" });

      return c.json({
        ok: true,
        message: "OpenAI API key updated successfully. Your business is now using its own API key.",
        billing_mode: "byok",
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to update OpenAI key" }, 500);
    }
  },

  // POST /settings/request-platform-switch
  requestPlatformSwitch: async (c: Context<Env>) => {
    try {
      const db = c.env.DB;
      const user = (c as any).get("user");
      const body = await c.req.json().catch(() => ({}));
      const notes = body.notes ? String(body.notes).trim() : undefined;

      const clientId = user?.clientId || (c as any).get("clientId") || "default";
      if (clientId === "default") {
        return c.json({ ok: false, error: "Default client cannot submit switch requests" }, 400);
      }

      // Check if there is already a pending request
      const existing = await apiKeyRequestsDb.getPendingRequestForClient(db, clientId);
      if (existing) {
        return c.json({
          ok: false,
          error: "You already have a pending switch request awaiting Super Admin approval.",
          request: existing,
        }, 400);
      }

      const request = await apiKeyRequestsDb.createRequest(db, {
        client_id: clientId,
        request_type: "switch_to_platform",
        requested_by: user?.id,
        notes,
      });

      return c.json({
        ok: true,
        message: "Switch request submitted successfully. A Super Admin will review and approve your request.",
        request,
      }, 201);
    } catch (err: any) {
      return c.json({ ok: false, error: err?.message || "Failed to submit switch request" }, 500);
    }
  },
};
