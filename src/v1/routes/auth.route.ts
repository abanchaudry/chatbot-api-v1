import { Hono } from "hono";
import { authController } from "../controllers/auth.controller";
import { auth } from "../middleware/auth.middleware";

type Env = {
  Bindings: { OPENAI_API_KEY: string; CONFIG: KVNamespace; DB: D1Database; CACHE: KVNamespace };
};

const authRoutes = new Hono<Env>();

authRoutes.post("/login", authController.login); 
authRoutes.post("/signup", authController.signup);
authRoutes.get("/users/all", auth, authController.getAllUsers); 
authRoutes.get("/user/:id", auth, authController.getUserById);

export default authRoutes;
