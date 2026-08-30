import { Hono } from "hono";
import { askPreflightController } from "../controllers/ask-preflight.controller";
import { askController } from "../controllers/ask.controller";
import { publicTenantContext } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const askRoutes = new Hono<Env>();

// Apply publicTenantContext to resolve Option A widget tokens (pk_live_...) or query params
askRoutes.use("*", publicTenantContext);

askRoutes.post("/preflight", askPreflightController.preflight);
askRoutes.post("/", askController.ask);
askRoutes.post("/stream", askController.askStream);
askRoutes.post("/purge-cache", askController.purgeCache);

export default askRoutes;