import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiterMiddleware } from "./v1/middleware/rateLimit.middleware";
import { v1Routes } from "./v1/routes/index.routes";
import type { Env } from "./v1/types/env";

const app = new Hono<Env>();
app.use("*", async (c, next) => {
  await next();
  c.header("x-request-id", crypto.randomUUID());
  c.header("server", "chatbot-api");
});


app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allow =
        c.env.ALLOWED_ORIGINS?.split(",").map((s: string) => s.trim()).filter(Boolean) || ["*"];
      if (allow.includes("*")) return "*";
      if (!origin) return "";
      return allow.includes(origin) ? origin : "";
    },
    allowHeaders: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.options("*", (c) =>
  c.body(null, 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  })
);

app.use("*", rateLimiterMiddleware);

v1Routes(app);

app.get("/healthz", (c) =>
  c.json({ ok: true, ts: new Date().toISOString(), version: c.env.APP_VERSION || "v3" })
);
app.get("/", (c) => c.text("Hello :)"));

app.get("/favicon.ico", (c) => c.body(null, 204));

app.notFound((c) => c.json({ message: "Route not found" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ message: "Internal Server Error" }, 500);
});

export default app;
