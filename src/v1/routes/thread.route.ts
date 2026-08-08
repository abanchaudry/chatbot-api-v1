import { Hono } from "hono";
import { threadController } from "../controllers/thread.controller";
import { auth } from "../middleware/auth.middleware";

type Env = {
  Bindings: { OPENAI_API_KEY: string; CONFIG: KVNamespace; DB: D1Database; CACHE: KVNamespace };
};

const threadRoutes = new Hono<Env>();

threadRoutes.get("/all", auth,threadController.getAllThreads); 
threadRoutes.get("/detail/:threadId" , threadController.getAllThreadMessages);

export default threadRoutes;
