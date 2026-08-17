import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiterMiddleware } from "./v1/middleware/rateLimit.middleware";
import { v1Routes } from "./v1/routes/index.routes";
import type { Env } from "./v1/types/env";

const app = new Hono<Env>();

// 1. Request ID & Server headers (Set BEFORE handler execution)
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  c.header("x-request-id", requestId);
  c.header("server", "chatbot-api");
  await next();
});

// 2. CORS Middleware with environment support
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env?.ALLOWED_ORIGINS;
      if (!allowed || allowed === "*") return origin || "*";
      const list = allowed.split(",").map((o: string) => o.trim().toLowerCase());
      if (origin && list.includes(origin.toLowerCase())) {
        return origin;
      }
      // Allow localhost during development
      if (origin && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
        return origin;
      }
      return list[0] || "*";
    },
    allowHeaders: ["*"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// 3. Distributed Rate Limiting
app.use("*", rateLimiterMiddleware);

// 4. Mount API Routes
v1Routes(app);

// 5. Root & Health Check Endpoints
app.get("/healthz", (c) =>
  c.json({
    ok: true,
    ts: new Date().toISOString(),
    version: c.env.APP_VERSION || "v1",
  })
);

app.get("/", (c) => c.text("Chatbot API v1 — Active"));
app.get("/favicon.ico", (c) => c.body(null, 204));

// 6. 404 & Global Error Handling
app.notFound((c) => c.json({ ok: false, message: "Route not found" }, 404));

app.onError((err, c) => {
  const reqId = c.res.headers.get("x-request-id") || "unknown";
  console.error(`[Error] Request ${reqId} failed:`, err?.message || err);
  return c.json(
    {
      ok: false,
      message: "Internal Server Error",
      requestId: reqId,
    },
    500
  );
});

export default app;
