import { Hono } from "hono";
import { askPreflightController } from "../controllers/ask-preflight.controller"
import { askController } from "../controllers/ask.controller"
import type { Env } from "../types/env";

const askRoutes = new Hono<Env>();

askRoutes.post("/preflight", askPreflightController.preflight);
askRoutes.post("/", askController.ask);
askRoutes.post("/stream", askController.askStream);
export default askRoutes;