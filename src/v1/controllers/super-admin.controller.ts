// src/v1/controllers/super-admin.controller.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import bcrypt from "bcryptjs";
import { clientsDb } from "../services/db/clients.db";
import { clientSecretsDb } from "../services/db/client-secrets.db";
import { authdb } from "../services/db/auth.db";
import { getJwtSecret } from "../utils/keys";

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
            error: `The username '${adminUsername}' is already taken. Please choose a unique username for this business (e.g. ${slug || name.toLowerCase()}_admin).`
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

      const newClient = await clientsDb.createClient(c.env.DB, {
        id: clientId,
        name,
        slug,
        domain,
        logo_url: logoUrl,
        billing_mode: billingMode,
        public_token: publicToken,
        status: "active",
      });

      // Save BYOK secrets if provided
      const masterKey = getJwtSecret(c.env);
      if (billingMode === "byok") {
        await clientSecretsDb.saveSecrets(
          c.env.DB,
          clientId,
          {
            openai_api_key: body.openai_api_key,
            cf_account_id: body.cf_account_id,
            cf_api_token: body.cf_api_token,
          },
          masterKey
        );
      }

      // Create initial admin login credentials for the client
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

      return c.json({
        ok: true,
        client,
        secrets: {
          has_openai_key: secrets.has_openai_key,
          openai_api_key_masked: secrets.openai_api_key_masked,
          cf_account_id: secrets.cf_account_id,
          has_cf_token: secrets.has_cf_token,
          cf_api_token_masked: secrets.cf_api_token_masked,
          updated_at: secrets.updated_at,
        },
        users,
      });
    } catch (err: any) {
      console.error("superAdmin.getClientDetails error:", err?.message || err);
      return c.json({ ok: false, error: err?.message || "Failed to fetch client details" }, 500);
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
        logo_url: body.logo_url,
        billing_mode: body.billing_mode,
        status: body.status,
      });

      if (!updated) {
        return c.json({ ok: false, error: "Client not found" }, 404);
      }

      // Update secrets if provided
      const masterKey = getJwtSecret(c.env);
      if (body.openai_api_key !== undefined || body.cf_api_token !== undefined || body.cf_account_id !== undefined) {
        await clientSecretsDb.saveSecrets(
          c.env.DB,
          clientId,
          {
            openai_api_key: body.openai_api_key,
            cf_account_id: body.cf_account_id,
            cf_api_token: body.cf_api_token,
          },
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
