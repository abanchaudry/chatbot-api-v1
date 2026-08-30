import { Hono } from "hono";
import dataRoutes from "./data.routes";
import askRoutes from "./ask.routes";
import chatAnalyticsRoutes from "./analytics.routes";
import messageTracesRoutes from "./message-traces.routes";
import qaRoutes from "./qa.routes";
import authRoutes from "./auth.route";
import threadRoutes from "./thread.route";
import settingsRoutes from "./settings.routes";
import crawlerRoutes from "./crawler.routes";
import superAdminRoutes from "./super-admin.routes";

import type { Env } from "../types/env";

export const v1Routes = (app: Hono<Env>) => {
  const mountRoutes = (prefix = "") => {
    app.route(`${prefix}/auth`, authRoutes);
    app.route(`${prefix}/super-admin`, superAdminRoutes);
    app.route(`${prefix}/thread`, threadRoutes);
    app.route(`${prefix}/data`, dataRoutes);
    app.route(`${prefix}/ask`, askRoutes);
    app.route(`${prefix}/analytics`, chatAnalyticsRoutes);
    app.route(`${prefix}/message-traces`, messageTracesRoutes);
    app.route(`${prefix}/qa`, qaRoutes);
    app.route(`${prefix}/settings`, settingsRoutes);
    app.route(`${prefix}/crawler`, crawlerRoutes);
  };

  // Mount at root for backward compatibility
  mountRoutes("");
  // Mount with /v1 prefix for standard API versioning
  mountRoutes("/v1");
};
