import { Hono } from "hono";
import type { Env } from "../types/env";
import { ChatAnalyticsController } from "../controllers/analytics.controller";

import { getFallbackClustersHandler, triggerFallbackClusteringHandler } from "../controllers/fallback-analytics.controller";

const chatAnalyticsRoutes = new Hono<Env>();

chatAnalyticsRoutes.get("/stats", ChatAnalyticsController.stats);
chatAnalyticsRoutes.get("/daily-breakdown", ChatAnalyticsController.dailyBreakdown);
chatAnalyticsRoutes.get("/threads", ChatAnalyticsController.threadsByDate);
chatAnalyticsRoutes.get("/threads/:threadId/messages", ChatAnalyticsController.threadMessages);

// Fallback Intelligence & Clustering endpoints
chatAnalyticsRoutes.get("/fallback-clusters", getFallbackClustersHandler as any);
chatAnalyticsRoutes.post("/run-clustering", triggerFallbackClusteringHandler as any);

export default chatAnalyticsRoutes;
