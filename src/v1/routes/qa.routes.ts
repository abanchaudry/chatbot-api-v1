import { Hono } from "hono";
import { QAController } from "../controllers/qa.controller";
import type { Env } from "../types/env";
import { requireAuthOrApiKey } from "../middleware/unifiedAuth.middleware";

const qaRoutes = new Hono<Env>();

qaRoutes.use("*", requireAuthOrApiKey);
qaRoutes.post("/run", QAController.run);
qaRoutes.post("/ask-only-batch", QAController.askOnlyBatch);

export default qaRoutes;