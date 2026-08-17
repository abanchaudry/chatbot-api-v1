// src/v1/controllers/fallback-analytics.controller.ts
import type { Context } from "hono";
import type { Env } from "../types/env";
import { fallbackDb } from "../services/db/fallback.db";
import { runFallbackClustering } from "../services/fallback-clustering.service";
import { SettingsDbService } from "../services/db/settings.db";

export async function getFallbackClustersHandler(c: Context<Env>) {
  try {
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "6", 10)), 100);

    const [clusters, totalClusters, unclusteredCount, settings] = await Promise.all([
      fallbackDb.getLatestClusters(c.env.DB, limit, page),
      fallbackDb.getActiveClustersCount(c.env.DB),
      fallbackDb.getUnclusteredCount(c.env.DB),
      new SettingsDbService().getSettings(c.env.DB),
    ]);

    const totalPages = Math.ceil(totalClusters / limit) || 1;
    const newCategoryClusters = clusters.filter((cl) => cl.is_new_category);

    return c.json({
      ok: true,
      unclusteredCount,
      totalClusters,
      totalPages,
      currentPage: page,
      limit,
      newCategorySuggestionsCount: newCategoryClusters.length,
      schedule: (settings as any)?.fallback_schedule || "weekly",
      clusters,
    });
  } catch (err: any) {
    console.error("getFallbackClustersHandler error:", err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}

export async function triggerFallbackClusteringHandler(c: Context<Env>) {
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

export async function getFallbackQueryCountHandler(c: Context<Env>) {
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

export async function getClusterQueriesHandler(c: Context<Env>) {
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
