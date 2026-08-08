import { Hono } from "hono";
import type { Env } from "../types/env";
import { settingsController } from "../controllers/settings.controller";

const settingsRoutes = new Hono<Env>();

settingsRoutes.get("/", settingsController.getSettings);
settingsRoutes.post("/", settingsController.saveSettings);
settingsRoutes.post("/generate-domain", settingsController.generateDomainPrompt);

export default settingsRoutes;
