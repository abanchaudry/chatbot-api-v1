import { Hono } from "hono";
import { CrawlerController } from "../controllers/crawler.controller";
import type { Env } from "../types/env";

const crawler = new Hono<Env>();

crawler.post("/crawl", CrawlerController.crawl);

export default crawler;
