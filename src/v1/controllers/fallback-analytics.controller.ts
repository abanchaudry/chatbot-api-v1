// src/v1/controllers/fallback-analytics.controller.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import { fallbackDb } from "../services/db/fallback.db";
import { runFallbackClustering } from "../services/fallback-clustering.service";
import { SettingsDbService } from "../services/db/settings.db";

export async function getFallbackClustersHandler(c: Context<{ Bindings: Env }>) {
  try {
    const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50", 10)), 100);
    const clusters = await fallbackDb.getLatestClusters(c.env.DB, limit);
    const unclusteredCount = await fallbackDb.getUnclusteredCount(c.env.DB);
    const settings = await new SettingsDbService().getSettings(c.env.DB);

    const newCategoryClusters = clusters.filter((cl) => cl.is_new_category);

    return c.json({
      ok: true,
      unclusteredCount,
      totalClusters: clusters.length,
      newCategorySuggestionsCount: newCategoryClusters.length,
      schedule: (settings as any)?.fallback_schedule || "weekly",
      clusters,
    });
  } catch (err: any) {
    console.error("getFallbackClustersHandler error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}

export async function triggerFallbackClusteringHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      period?: "daily" | "weekly" | "monthly" | "manual";
      startDate?: string;
      endDate?: string;
      recluster?: boolean;
      unclusteredOnly?: boolean;
    };

    const result = await runFallbackClustering(c.env, body);

    return c.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    console.error("triggerFallbackClusteringHandler error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}

export async function getFallbackQueryCountHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      startDate?: string;
      endDate?: string;
      unclusteredOnly?: boolean;
    };

    const count = await fallbackDb.getFallbackQueryCount(c.env.DB, body);

    return c.json({
      ok: true,
      count,
    });
  } catch (err: any) {
    console.error("getFallbackQueryCountHandler error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}

export async function getClusterQueriesHandler(c: Context<{ Bindings: Env }>) {
  try {
    const clusterId = c.req.param("clusterId");
    if (!clusterId) {
      return c.json({ ok: false, error: "clusterId parameter is required" }, 400);
    }
    const queries = await fallbackDb.getQueriesForCluster(c.env.DB, clusterId);
    return c.json({
      ok: true,
      clusterId,
      total: queries.length,
      queries,
    });
  } catch (err: any) {
    console.error("getClusterQueriesHandler error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}
