import { Hono } from "hono";
import type { Env } from "../types/env";
import { settingsController } from "../controllers/settings.controller";
import { requireAuthOrApiKey } from "../middleware/unifiedAuth.middleware";

const settingsRoutes = new Hono<Env>();

settingsRoutes.use("*", requireAuthOrApiKey);
settingsRoutes.get("/", settingsController.getSettings);
settingsRoutes.post("/", settingsController.saveSettings);
settingsRoutes.post("/generate-domain", settingsController.generateDomainPrompt);

// API Key management
settingsRoutes.get("/api-key-status", settingsController.getApiKeyStatus);
settingsRoutes.post("/openai-key", settingsController.updateOpenAIKey);
settingsRoutes.post("/request-platform-switch", settingsController.requestPlatformSwitch);

export default settingsRoutes;
