import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";

const MAX_REQUESTS_PER_MINUTE = 600;

export const rateLimiterMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const ip =
    c.req.header("CF-Connecting-IP") ||
    (c.req.header("X-Forwarded-For") || "").split(",")[0]?.trim() ||
    "127.0.0.1";

  // Skip rate limit for internal health checks
  if (c.req.path === "/healthz" || c.req.path === "/favicon.ico") {
    return next();
  }

  if (c.env?.CACHE) {
    try {
      const windowKey = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
      const current = await c.env.CACHE.get(windowKey);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= MAX_REQUESTS_PER_MINUTE) {
        return c.json({ ok: false, message: "Too many requests. Please try again later." }, 429);
      }

      // Store count with 120s TTL
      await c.env.CACHE.put(windowKey, String(count + 1), { expirationTtl: 120 });
    } catch (e) {
      console.warn("Rate limiter KV check error:", e);
    }
  }

  await next();
};
