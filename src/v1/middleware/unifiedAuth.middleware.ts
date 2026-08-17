import type { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { Env } from "../types/env";

export const requireAuthOrApiKey: MiddlewareHandler<Env> = async (c: Context<Env>, next) => {
  // 1. Check API Key header
  const configuredAdminKey =
    c.env.ADMIN_API_KEY || (await c.env.CONFIG?.get("ADMIN_API_KEY"));

  const apiKeyHeader =
    c.req.header("x-api-key") ||
    c.req.header("x-admin-key") ||
    c.req.header("admin_api_key");

  if (configuredAdminKey && apiKeyHeader && apiKeyHeader === configuredAdminKey) {
    return next();
  }

  // 2. Check JWT Authorization header
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (!c.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return c.json({ ok: false, message: "Authentication configuration error" }, 500);
    }

    try {
      const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, jwtSecret);
      (c as any).set("user", payload);
      return next();
    } catch {
      return c.json({ ok: false, message: "Invalid or expired authorization token" }, 401);
    }
  }

  // If both fail:
  if (!configuredAdminKey && !c.env.JWT_SECRET) {
    return c.json({ ok: false, message: "Server misconfiguration: No auth secret configured" }, 503);
  }

  return c.json(
    { ok: false, message: "Unauthorized. Please provide a valid Authorization token or API key." },
    401
  );
};
