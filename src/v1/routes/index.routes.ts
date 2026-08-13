import { Hono } from "hono";
import dataRoutes from "./data.routes";
import askRoutes from "./ask.routes";
import chatAnalyticsRoutes from "./analytics.routes";
import messageTracesRoutes  from "./message-traces.routes";
import qaRoutes from "./qa.routes";
import authRoutes from "./auth.route";
import threadRoutes from "./thread.route";
import settingsRoutes from "./settings.routes";
import crawlerRoutes from "./crawler.routes";

import type { Env } from "../types/env";

export const v1Routes = (app: Hono<Env>) => {
  app.route("/auth", authRoutes);
  app.route("/thread", threadRoutes);
  app.route("/data", dataRoutes);
  app.route("/ask", askRoutes);
  app.route("/analytics", chatAnalyticsRoutes);
  app.route("/message-traces", messageTracesRoutes);
  app.route("/qa", qaRoutes);
  app.route("/settings", settingsRoutes);
  app.route("/crawler", crawlerRoutes);
};
