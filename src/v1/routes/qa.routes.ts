import { Hono } from "hono";
import { QAController } from "../controllers/qa.controller"
import { askController } from "../controllers/ask.controller"
import type { Env } from "../types/env";

const qaRoutes = new Hono<Env>();

qaRoutes.post("/run", QAController.run);
qaRoutes.post("/ask-only-batch", QAController.askOnlyBatch);
export default qaRoutes;