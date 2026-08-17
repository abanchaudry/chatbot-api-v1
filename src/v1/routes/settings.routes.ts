import { Hono } from "hono";
import type { Env } from "../types/env";
import { settingsController } from "../controllers/settings.controller";
import { requireAuthOrApiKey } from "../middleware/unifiedAuth.middleware";

const settingsRoutes = new Hono<Env>();

settingsRoutes.use("*", requireAuthOrApiKey);
settingsRoutes.get("/", settingsController.getSettings);
settingsRoutes.post("/", settingsController.saveSettings);
settingsRoutes.post("/generate-domain", settingsController.generateDomainPrompt);

export default settingsRoutes;
