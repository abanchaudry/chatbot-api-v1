import type { MiddlewareHandler } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 1000,
  duration: 60,
});

export const rateLimiterMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      (c.req.header("X-Forwarded-For") || "").split(",")[0]?.trim() ||
      "unknown";

    await rateLimiter.consume(ip);
    await next();
  } catch {
    return c.json({ message: "Too many requests. Please try again later." }, 429);
  }
};
