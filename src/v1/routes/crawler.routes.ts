import { Hono } from "hono";
import { CrawlerController } from "../controllers/crawler.controller";
import type { Env } from "../types/env";
import { requireAuthOrApiKey, resolveTenantContext } from "../middleware/unifiedAuth.middleware";

const crawler = new Hono<Env>();

crawler.use("*", requireAuthOrApiKey, resolveTenantContext);
crawler.post("/crawl", CrawlerController.crawl);
crawler.post("/discover", CrawlerController.discover);
crawler.post("/crawl-selected", CrawlerController.crawlSelected);

export default crawler;
