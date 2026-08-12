import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiterMiddleware } from "./v1/middleware/rateLimit.middleware";
import { v1Routes } from "./v1/routes/index.routes";
const app = new Hono<Env>();

app.use(
  "*",
  cors({

    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

app.options("*", (c) => c.body(null, 204));

app.use("*", async (c, next) => {
  await next();
  c.header("x-request-id", crypto.randomUUID());
  c.header("server", "chatbot-api");
});

app.use("*", rateLimiterMiddleware);


v1Routes(app);

app.get("/healthz", (c) =>
  c.json({ ok: true, ts: new Date().toISOString(), version: c.env.APP_VERSION || "v3.1" })

);
app.get("/", (c) => c.text("Hello :)"));

app.get("/favicon.ico", (c) => c.body(null, 204));

app.notFound((c) => c.json({ message: "Route not found" }, 404));
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ message: "Internal Server Error" }, 500);
});

export default app;
