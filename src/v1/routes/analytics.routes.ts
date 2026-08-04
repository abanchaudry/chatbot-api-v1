import { Hono } from "hono";
import type { Env } from "../types/env";
import { ChatAnalyticsController } from "../controllers/analytics.controller";

const chatAnalyticsRoutes = new Hono<Env>();

chatAnalyticsRoutes.get("/stats", ChatAnalyticsController.stats);
chatAnalyticsRoutes.get("/daily-breakdown", ChatAnalyticsController.dailyBreakdown);
chatAnalyticsRoutes.get("/threads", ChatAnalyticsController.threadsByDate);
chatAnalyticsRoutes.get("/threads/:threadId/messages", ChatAnalyticsController.threadMessages);

export default chatAnalyticsRoutes;
