import { Hono } from "hono";
import { threadController } from "../controllers/thread.controller";
import { requireAuthOrApiKey, resolveTenantContext } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const threadRoutes = new Hono<Env>();

threadRoutes.use("*", resolveTenantContext);

threadRoutes.get("/all", requireAuthOrApiKey, threadController.getAllThreads); 
threadRoutes.get("/detail/:threadId", threadController.getAllThreadMessages);

export default threadRoutes;
