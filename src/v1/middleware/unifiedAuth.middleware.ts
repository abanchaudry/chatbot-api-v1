// src/v1/middleware/unifiedAuth.middleware.ts
import type { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { Env } from "../types/env";
import { getJwtSecret } from "../utils/keys";
import { clientsDb } from "../services/db/clients.db";

/**
 * Standard Auth or Admin API Key middleware.
 */
export const requireAuthOrApiKey: MiddlewareHandler<Env> = async (c: Context<Env>, next) => {
  // 1. Check API Key header
  const configuredAdminKey =
    c.env.ADMIN_API_KEY || (await c.env.CONFIG?.get("ADMIN_API_KEY"));

  const apiKeyHeader =
    c.req.header("x-api-key") ||
    c.req.header("x-admin-key") ||
    c.req.header("admin_api_key");

  if (configuredAdminKey && apiKeyHeader && apiKeyHeader === configuredAdminKey) {
    (c as any).set("user", { id: "master_admin", username: "superadmin", role: "super_admin", clientId: null });
    return next();
  }

  // 2. Check JWT Authorization header
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const jwtSecretStr = getJwtSecret(c.env);
      const jwtSecret = new TextEncoder().encode(jwtSecretStr);
      const { payload } = await jwtVerify(token, jwtSecret);
      (c as any).set("user", payload);
      return next();
    } catch {
      return c.json({ ok: false, message: "Invalid or expired authorization token" }, 401);
    }
  }

  return c.json(
    { ok: false, message: "Unauthorized. Please provide a valid Authorization token or API key." },
    401
  );
};

/**
 * Strict Super Admin middleware. Requires role === 'super_admin' or valid master API key.
 */
export const requireSuperAdmin: MiddlewareHandler<Env> = async (c: Context<Env>, next) => {
  // 1. Check API Key header
  const configuredAdminKey =
    c.env.ADMIN_API_KEY || (await c.env.CONFIG?.get("ADMIN_API_KEY"));

  const apiKeyHeader =
    c.req.header("x-api-key") ||
    c.req.header("x-admin-key") ||
    c.req.header("admin_api_key");

  if (configuredAdminKey && apiKeyHeader && apiKeyHeader === configuredAdminKey) {
    (c as any).set("user", { id: "master_admin", username: "superadmin", role: "super_admin", clientId: null });
    return next();
  }

  // 2. Check JWT
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const jwtSecretStr = getJwtSecret(c.env);
      const jwtSecret = new TextEncoder().encode(jwtSecretStr);
      const { payload } = await jwtVerify(token, jwtSecret);
      
      if (payload.role !== "super_admin") {
        return c.json({ ok: false, message: "Forbidden. Super Admin access required." }, 403);
      }

      (c as any).set("user", payload);
      return next();
    } catch {
      return c.json({ ok: false, message: "Invalid or expired authorization token" }, 401);
    }
  }

  return c.json(
    { ok: false, message: "Unauthorized. Super Admin authorization required." },
    401
  );
};

/**
 * Tenant Context Middleware: Resolves effective clientId from JWT or Super Admin override.
 */
export const resolveTenantContext: MiddlewareHandler<Env> = async (c: Context<Env>, next) => {
  const user = (c as any).get("user");
  const headerClient = c.req.header("x-client-id");
  const queryClient = c.req.query("clientId") || c.req.query("client_id");
  
  let effectiveClientId = "default";

  if (user) {
    if (user.role === "super_admin") {
      // Super admin can specify tenant via header or query param
      effectiveClientId = headerClient || queryClient || user.clientId || "default";
    } else {
      // Client admin is strictly bound to their client_id
      effectiveClientId = user.clientId || "default";
    }
  } else if (headerClient || queryClient) {
    effectiveClientId = headerClient || queryClient || "default";
  }

  (c as any).set("clientId", effectiveClientId);
  return next();
};

/**
 * Public Chat Widget Option A Middleware: Resolves client by public token (pk_live_...)
 */
export const publicTenantContext: MiddlewareHandler<Env> = async (c: Context<Env>, next) => {
  let client = null;

  // 1. Check Authorization Bearer JWT (for logged-in Client Admin or Super Admin in Playground)
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const jwtSecretStr = getJwtSecret(c.env);
      const jwtSecret = new TextEncoder().encode(jwtSecretStr);
      const { payload } = await jwtVerify(token, jwtSecret);
      (c as any).set("user", payload);

      const headerClient = c.req.header("x-client-id");
      const targetClientId = (payload.role === "super_admin" && headerClient) ? headerClient : (payload.clientId as string);
      if (targetClientId) {
        client = await clientsDb.getClientById(c.env.DB, targetClientId);
      }
    } catch {}
  }

  // 2. Check x-client-id header or clientId query param
  if (!client) {
    const headerClient = c.req.header("x-client-id");
    const queryClient = c.req.query("clientId") || c.req.query("client_id");
    if (headerClient || queryClient) {
      const targetId = (headerClient || queryClient) as string;
      client = await clientsDb.getClientById(c.env.DB, targetId) || await clientsDb.getClientBySlug(c.env.DB, targetId);
    }
  }

  // 3. Check public widget token (Option A pk_live_...)
  if (!client) {
    let publicToken =
      c.req.header("x-client-token") ||
      c.req.header("x-public-token") ||
      c.req.query("client_token") ||
      c.req.query("token");

    // Fallback to reading JSON body if available
    if (!publicToken && c.req.method === "POST") {
      try {
        const cloned = c.req.raw.clone();
        const body = await cloned.json().catch(() => ({}));
        if (body?.client_token || body?.public_token || body?.clientId) {
          publicToken = body.client_token || body.public_token || body.clientId;
        }
      } catch {}
    }

    if (publicToken) {
      client = await clientsDb.getClientByPublicToken(c.env.DB, publicToken);
      if (!client) {
        client = await clientsDb.getClientById(c.env.DB, publicToken) || await clientsDb.getClientBySlug(c.env.DB, publicToken);
      }
    }
  }

  // 4. Fallback to default client if none provided
  if (!client) {
    client = await clientsDb.getClientById(c.env.DB, "default");
  }

  if (client && client.status === "suspended") {
    return c.json(
      {
        ok: false,
        message: "This chatbot service is currently suspended. Please contact support.",
      },
      403
    );
  }

  (c as any).set("client", client);
  (c as any).set("clientId", client?.id || "default");
  return next();
};
