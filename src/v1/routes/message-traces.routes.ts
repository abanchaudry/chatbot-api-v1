import { Hono } from "hono";
import type { Env } from "../types/env";
import { MessageTracesController } from "../controllers/message-traces.controller";

const messageTracesRoutes = new Hono<Env>();

messageTracesRoutes.get("/messages/:messageId/trace", MessageTracesController.getLatestForMessage);
messageTracesRoutes.get("/messages/:messageId/traces", MessageTracesController.getAllForMessage);

export default messageTracesRoutes;

