// src/v1/controllers/super-admin.controller.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import bcrypt from "bcryptjs";
import { clientsDb } from "../services/db/clients.db";
import { clientSecretsDb } from "../services/db/client-secrets.db";
import { clientResourcesDb } from "../services/db/client-resources.db";
import { apiKeyRequestsDb } from "../services/db/api-key-requests.db";
import { authdb } from "../services/db/auth.db";
import { getJwtSecret } from "../utils/keys";
import { cloudflareProvisionerService } from "../services/cloudflare-provisioner.service";

export const superAdminController = {
  // GET /super-admin/clients
  listClients: async (c: Context<Env>) => {
    try {
      const clients = await clientsDb.getAllClients(c.env.DB);
      return c.json({ ok: true, clients });
    } catch (err: any) {
      console.error("superAdmin.listClients error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to list clients" }, 500);
    }
  },

  // POST /super-admin/clients
  createClient: async (c: Context<Env>) => {
    try {
      const body = await c.req.json();
      const name = String(body.name || "").trim();
      let slug = String(body.slug || "").toLowerCase().trim();
      const domain = String(body.domain || "").trim() || undefined;
      const logoUrl = String(body.logo_url || "").trim() || undefined;
      const billingMode = body.billing_mode === "byok" ? "byok" : "platform";

      if (!name) {
        return c.json({ ok: false, error: "Business name is required." }, 400);
      }

      // Check username collision FIRST before creating any client
      let adminUsername = String(body.admin_username || "").trim();
      let adminPassword = String(body.admin_password || "").trim();
      if (adminUsername) {
        const existingUser = await authdb.getUserByUsername(c.env.DB, adminUsername);
        if (existingUser) {
          return c.json({
            ok: false,
            error: `The username '${adminUsername}' is already taken. Please choose a unique username for this business.`
          }, 400);
        }
      }

      if (!slug) {
        slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      // Check for slug collision
      const existing = await clientsDb.getClientBySlug(c.env.DB, slug);
      if (existing) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const clientId = `client_${slug}`;
      const publicToken = `pk_live_${crypto.randomUUID().replace(/-/g, "")}`;

      // 1. Create client record in central DB
      const newClient = await clientsDb.createClient(c.env.DB, {
        id: clientId,
        name,
        slug,
        domain,
        contact_email: body.contact_email,
        logo_url: logoUrl,
        billing_mode: billingMode,
        public_token: publicToken,
        status: "active",
      });

      // 2. Save client secrets (OpenAI API key) if provided
      const masterKey = getJwtSecret(c.env);
      if (billingMode === "byok" && body.openai_api_key) {
        await clientSecretsDb.saveSecrets(
          c.env.DB,
          clientId,
          { openai_api_key: body.openai_api_key },
          masterKey
        );
      }

      // 3. Provision dedicated Cloudflare resources (D1, KV, Vectorize, R2)
      const cfAccountId = c.env.CF_ACCOUNT_ID;
      const cfApiToken = (c.env as any).CF_PLATFORM_API_TOKEN || (c.env as any).CF_AI_SEARCH_TOKEN;

      let provisionedResources = null;
      if (cfAccountId && cfApiToken) {
        try {
          await clientResourcesDb.saveResources(c.env.DB, clientId, {
            provisioning_status: "provisioning",
            d1_database_name: `chatbot-${slug}-db`,
            kv_namespace_name: `chatbot-${slug}-cache`,
            vectorize_admin_index: `chatbot-${slug}-admin`,
            vectorize_pdf_index: `chatbot-${slug}-pdf`,
            vectorize_web_index: `chatbot-${slug}-web`,
            vectorize_cache_index: `chatbot-${slug}-qcache`,
            r2_bucket_name: `chatbot-${slug}-storage`,
          });

          const result = await cloudflareProvisionerService.provisionTenantResources(
            cfAccountId,
            cfApiToken,
            slug
          );

          await clientResourcesDb.saveResources(c.env.DB, clientId, {
            ...result,
            provisioning_status: "ready",
            provisioned_at: new Date().toISOString(),
          });

          provisionedResources = result;
        } catch (provErr: any) {
          console.error(`[Provisioning] Failed to provision Cloudflare resources for ${slug}:`, provErr?.message || provErr);
          await clientResourcesDb.saveResources(c.env.DB, clientId, {
            provisioning_status: "failed",
            provisioning_error: provErr?.message || "Failed to provision Cloudflare resources",
            d1_database_name: `chatbot-${slug}-db`,
            kv_namespace_name: `chatbot-${slug}-cache`,
            vectorize_admin_index: `chatbot-${slug}-admin`,
            vectorize_pdf_index: `chatbot-${slug}-pdf`,
            vectorize_web_index: `chatbot-${slug}-web`,
            vectorize_cache_index: `chatbot-${slug}-qcache`,
            r2_bucket_name: `chatbot-${slug}-storage`,
          });
        }
      } else {
        // Local dev or token not set: record pre-allocated resource names
        await clientResourcesDb.saveResources(c.env.DB, clientId, {
          provisioning_status: "ready",
          d1_database_name: `chatbot-${slug}-db`,
          kv_namespace_name: `chatbot-${slug}-cache`,
          vectorize_admin_index: `chatbot-${slug}-admin`,
          vectorize_pdf_index: `chatbot-${slug}-pdf`,
          vectorize_web_index: `chatbot-${slug}-web`,
          vectorize_cache_index: `chatbot-${slug}-qcache`,
          r2_bucket_name: `chatbot-${slug}-storage`,
          provisioned_at: new Date().toISOString(),
        });
      }

      // 4. Create initial admin login credentials
      let createdUser = null;
      if (adminUsername && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await authdb.saveUser(
          c.env.DB,
          adminUsername,
          hashedPassword,
          "client_admin",
          clientId
        );
        createdUser = { username: adminUsername };
      }

      return c.json({
        ok: true,
        client: newClient,
        created_user: createdUser,
        resources: provisionedResources,
      }, 201);
    } catch (err: any) {
      console.error("superAdmin.createClient error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to create client" }, 500);
    }
  },

  // GET /super-admin/clients/:id
  getClientDetails: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      const client = await clientsDb.getClientById(c.env.DB, clientId);
      if (!client) {
        return c.json({ ok: false, error: "Client not found" }, 404);
      }

      const masterKey = getJwtSecret(c.env);
      const secrets = await clientSecretsDb.getDecryptedSecrets(c.env.DB, clientId, masterKey);
      const users = await authdb.getUsersByClientId(c.env.DB, clientId);
      const resources = await clientResourcesDb.getResources(c.env.DB, clientId);

      return c.json({
        ok: true,
        client,
        secrets: {
          has_openai_key: secrets.has_openai_key,
          openai_api_key_masked: secrets.openai_api_key_masked,
          updated_at: secrets.updated_at,
        },
        resources,
        users,
      });
    } catch (err: any) {
      console.error("superAdmin.getClientDetails error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to fetch client details" }, 500);
    }
  },

  // GET /super-admin/clients/:id/resources
  getClientResources: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      const resources = await clientResourcesDb.getResources(c.env.DB, clientId);
      return c.json({ ok: true, resources });
    } catch (err: any) {
      console.error("superAdmin.getClientResources error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to fetch client resources" }, 500);
    }
  },

  // PUT /super-admin/clients/:id
  updateClient: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      const body = await c.req.json();

      const updated = await clientsDb.updateClient(c.env.DB, clientId, {
        name: body.name,
        slug: body.slug,
        domain: body.domain,
        contact_email: body.contact_email,
        logo_url: body.logo_url,
        billing_mode: body.billing_mode,
        status: body.status,
      });

      if (!updated) {
        return c.json({ ok: false, error: "Client not found" }, 404);
      }

      // Update secrets if provided
      const masterKey = getJwtSecret(c.env);
      if (body.openai_api_key !== undefined) {
        await clientSecretsDb.saveSecrets(
          c.env.DB,
          clientId,
          { openai_api_key: body.openai_api_key },
          masterKey
        );
      }

      return c.json({ ok: true, client: updated });
    } catch (err: any) {
      console.error("superAdmin.updateClient error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to update client" }, 500);
    }
  },

  // DELETE /super-admin/clients/:id
  deleteClient: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      if (clientId === "default") {
        return c.json({ ok: false, error: "Cannot delete default system client" }, 400);
      }

      // 1. Cleanup Cloudflare resources if provisioned
      const resources = await clientResourcesDb.getResources(c.env.DB, clientId);
      const cfAccountId = c.env.CF_ACCOUNT_ID;
      const cfApiToken = (c.env as any).CF_PLATFORM_API_TOKEN || (c.env as any).CF_AI_SEARCH_TOKEN;

      if (resources && cfAccountId && cfApiToken) {
        try {
          await cloudflareProvisionerService.deleteAllResources(cfAccountId, cfApiToken, resources);
        } catch (delErr) {
          console.warn(`[Provisioner] Cleanup warning for client ${clientId}:`, delErr);
        }
      }

      // 2. Delete database records
      await clientResourcesDb.deleteResources(c.env.DB, clientId);
      await clientSecretsDb.deleteSecrets(c.env.DB, clientId);
      const success = await clientsDb.deleteClient(c.env.DB, clientId);

      return c.json({ ok: success });
    } catch (err: any) {
      console.error("superAdmin.deleteClient error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to delete client" }, 500);
    }
  },

  // POST /super-admin/clients/:id/users
  createClientUser: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      const body = await c.req.json();
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();

      if (!username || !password) {
        return c.json({ ok: false, error: "Username and password are required" }, 400);
      }

      const existing = await authdb.getUserByUsername(c.env.DB, username);
      if (existing) {
        return c.json({ ok: false, error: "Username already exists" }, 409);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await authdb.saveUser(c.env.DB, username, hashedPassword, "client_admin", clientId);

      const users = await authdb.getUsersByClientId(c.env.DB, clientId);
      return c.json({ ok: true, message: "User created successfully", users }, 201);
    } catch (err: any) {
      console.error("superAdmin.createClientUser error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to create client user" }, 500);
    }
  },

  // PUT /super-admin/users/:userId/password
  resetUserPassword: async (c: Context<Env>) => {
    try {
      const userId = c.req.param("userId");
      const body = await c.req.json();
      const password = String(body.password || "").trim();

      if (!password) {
        return c.json({ ok: false, error: "Password is required" }, 400);
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await authdb.updatePassword(c.env.DB, userId, hashedPassword);

      return c.json({ ok: true, message: "Password updated successfully" });
    } catch (err: any) {
      console.error("superAdmin.resetUserPassword error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to reset password" }, 500);
    }
  },

  // DELETE /super-admin/users/:userId
  deleteUser: async (c: Context<Env>) => {
    try {
      const userId = c.req.param("userId");
      await authdb.deleteUser(c.env.DB, userId);
      return c.json({ ok: true, message: "User deleted successfully" });
    } catch (err: any) {
      console.error("superAdmin.deleteUser error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to delete user" }, 500);
    }
  },

  // GET /super-admin/clients/:id/users
  listClientUsers: async (c: Context<Env>) => {
    try {
      const clientId = c.req.param("id");
      const users = await authdb.getUsersByClientId(c.env.DB, clientId);
      return c.json({ ok: true, users });
    } catch (err: any) {
      console.error("superAdmin.listClientUsers error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to list client users" }, 500);
    }
  },

  // GET /super-admin/api-key-requests
  listApiKeyRequests: async (c: Context<Env>) => {
    try {
      const status = c.req.query("status");
      const requests = await apiKeyRequestsDb.getAllRequests(c.env.DB, status);
      return c.json({ ok: true, requests });
    } catch (err: any) {
      console.error("superAdmin.listApiKeyRequests error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to list API key requests" }, 500);
    }
  },

  // PUT /super-admin/api-key-requests/:id/review
  reviewApiKeyRequest: async (c: Context<Env>) => {
    try {
      const requestId = c.req.param("id");
      const body = await c.req.json();
      const status = body.status as "approved" | "rejected";
      const notes = body.notes;
      const user = (c as any).get("user");

      if (!status || (status !== "approved" && status !== "rejected")) {
        return c.json({ ok: false, error: "Status must be 'approved' or 'rejected'" }, 400);
      }

      const req = await apiKeyRequestsDb.getRequestById(c.env.DB, requestId);
      if (!req) {
        return c.json({ ok: false, error: "Request not found" }, 404);
      }

      // If approved, update client billing_mode
      if (status === "approved") {
        if (req.request_type === "switch_to_platform") {
          await clientsDb.updateClient(c.env.DB, req.client_id, { billing_mode: "platform" });
          await clientSecretsDb.saveSecrets(
            c.env.DB,
            req.client_id,
            { openai_api_key: "" },
            getJwtSecret(c.env)
          );
        } else if (req.request_type === "switch_to_own") {
          await clientsDb.updateClient(c.env.DB, req.client_id, { billing_mode: "byok" });
        }
      }

      await apiKeyRequestsDb.reviewRequest(c.env.DB, requestId, {
        status,
        reviewed_by: user?.id,
        notes,
      });

      return c.json({ ok: true, message: `Request has been ${status}` });
    } catch (err: any) {
      console.error("superAdmin.reviewApiKeyRequest error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to review request" }, 500);
    }
  },

  // GET /super-admin/stats
  getPlatformStats: async (c: Context<Env>) => {
    try {
      const stats = await clientsDb.getPlatformStats(c.env.DB);
      return c.json({ ok: true, stats });
    } catch (err: any) {
      console.error("superAdmin.getPlatformStats error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to fetch platform stats" }, 500);
    }
  },
};
