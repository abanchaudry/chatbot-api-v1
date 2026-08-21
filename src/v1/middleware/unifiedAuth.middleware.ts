import type { Context, MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import type { Env } from "../types/env";
import { getJwtSecret } from "../utils/keys";

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
