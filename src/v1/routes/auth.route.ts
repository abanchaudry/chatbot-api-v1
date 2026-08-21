import { Hono } from "hono";
import { authController } from "../controllers/auth.controller";
import { requireAuthOrApiKey } from "../middleware/unifiedAuth.middleware";
import type { Env } from "../types/env";

const authRoutes = new Hono<Env>();

authRoutes.post("/login", authController.login); 
authRoutes.post("/signup", authController.signup);
authRoutes.get("/users/all", requireAuthOrApiKey, authController.getAllUsers); 
authRoutes.get("/user/:id", requireAuthOrApiKey, authController.getUserById);

export default authRoutes;
