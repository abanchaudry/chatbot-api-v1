// src/v1/routes/super-admin.routes.ts
import { Hono } from "hono";
import { superAdminController } from "../controllers/super-admin.controller";
import { requireSuperAdmin } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const superAdminRoutes = new Hono<Env>();

// Apply requireSuperAdmin to all routes in this router
superAdminRoutes.use("*", requireSuperAdmin);

superAdminRoutes.get("/stats", superAdminController.getPlatformStats);
superAdminRoutes.get("/clients", superAdminController.listClients);
superAdminRoutes.post("/clients", superAdminController.createClient);
superAdminRoutes.get("/clients/:id", superAdminController.getClientDetails);
superAdminRoutes.put("/clients/:id", superAdminController.updateClient);
superAdminRoutes.delete("/clients/:id", superAdminController.deleteClient);
superAdminRoutes.get("/clients/:id/users", superAdminController.listClientUsers);
superAdminRoutes.post("/clients/:id/users", superAdminController.createClientUser);
superAdminRoutes.put("/users/:userId/password", superAdminController.resetUserPassword);
superAdminRoutes.delete("/users/:userId", superAdminController.deleteUser);

export default superAdminRoutes;
