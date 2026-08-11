// src/v1/services/db/fallback.db.ts
import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";

export interface FallbackQueryRecord {
  id: string;
  thread_id?: string | null;
  user_id?: string | null;
  query_text: string;
  reason?: string | null;
  cluster_id?: string | null;
  created_at: string;
}

export interface FallbackClusterRecord {
  id: string;
  cluster_name: string;
  summary: string;
  query_count: number;
  sample_queries: string[];
  suggested_action: string;
  is_new_category: boolean;
  suggested_category_name?: string | null;
  frequency_period: 'daily' | 'weekly' | 'monthly' | 'manual';
  created_at: string;
}

export const fallbackDb = {
  /**
   * Log a raw fallback query into the database for future clustering.
   */
  async logFallbackQuery(
    db: D1Database,
    args: { query: string; threadId?: string; userId?: string; reason?: string }
  ) {
    if (!args.query || !args.query.trim()) return null;
    const id = nanoid();

    try {
      await db
        .prepare(
          `INSERT INTO fallback_queries (id, thread_id, user_id, query_text, reason, created_at)
           VALUES (?, ?, ?, ?, ?, datetime())`
        )
        .bind(id, args.threadId || null, args.userId || null, args.query.trim(), args.reason || "final_fallback")
        .run();
      return id;
    } catch (err) {
      console.error("Failed to log fallback query:", err);
      return null;
    }
  },

  /**
   * Fetch unclustered fallback queries for a given period (in days).
   */
  async getUnclusteredQueries(db: D1Database, periodDays: number = 7) {
    try {
      const { results } = await db
        .prepare(
          `SELECT id, thread_id, user_id, query_text, reason, created_at
           FROM fallback_queries
           WHERE cluster_id IS NULL
           ORDER BY created_at DESC
           LIMIT 2000`
        )
        .all();

      return (results || []) as unknown as FallbackQueryRecord[];
    } catch (err) {
      console.error("Failed to fetch unclustered fallback queries:", err);
      return [];
    }
  },

  /**
   * Fetch fallback queries by date range and clustering status.
   */
  async getFallbackQueriesByFilter(
    db: D1Database,
    filter: { startDate?: string; endDate?: string; unclusteredOnly?: boolean; limit?: number }
  ) {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter.unclusteredOnly !== false) {
        conditions.push("cluster_id IS NULL");
      }
      if (filter.startDate) {
        conditions.push("created_at >= ?");
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push("created_at <= ?");
        params.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limitVal = filter.limit || 2000;

      const query = `
        SELECT id, thread_id, user_id, query_text, reason, cluster_id, created_at
        FROM fallback_queries
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limitVal}
      `;

      const stmt = db.prepare(query);
      const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
      return (results || []) as unknown as FallbackQueryRecord[];
    } catch (err) {
      console.error("Failed to fetch fallback queries by filter:", err);
      return [];
    }
  },

  /**
   * Reset cluster_id assignments for a date range (for re-clustering).
   */
  async resetClusterIdsForDateRange(
    db: D1Database,
    filter: { startDate?: string; endDate?: string }
  ) {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter.startDate) {
        conditions.push("created_at >= ?");
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push("created_at <= ?");
        params.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `UPDATE fallback_queries SET cluster_id = NULL ${whereClause}`;

      const stmt = db.prepare(query);
      if (params.length > 0) {
        await stmt.bind(...params).run();
      } else {
        await stmt.run();
      }
      return true;
    } catch (err) {
      console.error("Failed to reset cluster ids for date range:", err);
      return false;
    }
  },

  /**
   * Get total query count matching custom filters.
   */
  async getFallbackQueryCount(
    db: D1Database,
    filter: { startDate?: string; endDate?: string; unclusteredOnly?: boolean }
  ) {
    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter.unclusteredOnly !== false) {
        conditions.push("cluster_id IS NULL");
      }
      if (filter.startDate) {
        conditions.push("created_at >= ?");
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push("created_at <= ?");
        params.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const query = `SELECT COUNT(*) as cnt FROM fallback_queries ${whereClause}`;

      const stmt = db.prepare(query);
      const row: any = params.length > 0 ? await stmt.bind(...params).first() : await stmt.first();
      return Number(row?.cnt || 0);
    } catch (err) {
      console.error("Failed to count fallback queries:", err);
      return 0;
    }
  },

  /**
   * Save generated LLM clusters and update linked query IDs.
   */
  async saveCluster(
    db: D1Database,
    cluster: {
      name: string;
      summary: string;
      queryCount: number;
      sampleQueries: string[];
      suggestedAction: string;
      isNewCategory: boolean;
      suggestedCategoryName?: string;
      frequencyPeriod: 'daily' | 'weekly' | 'monthly' | 'manual';
      linkedQueryIds: string[];
    }
  ) {
    const clusterId = nanoid();
    const sampleJson = JSON.stringify(cluster.sampleQueries || []);

    try {
      await db
        .prepare(
          `INSERT INTO fallback_clusters (
            id, cluster_name, summary, query_count, sample_queries,
            suggested_action, is_new_category, suggested_category_name, frequency_period, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime())`
        )
        .bind(
          clusterId,
          cluster.name,
          cluster.summary,
          cluster.queryCount,
          sampleJson,
          cluster.suggestedAction,
          cluster.isNewCategory ? 1 : 0,
          cluster.suggestedCategoryName || null,
          cluster.frequencyPeriod
        )
        .run();

      // Link queries to cluster ID
      if (cluster.linkedQueryIds && cluster.linkedQueryIds.length > 0) {
        const placeholders = cluster.linkedQueryIds.map(() => "?").join(",");
        await db
          .prepare(`UPDATE fallback_queries SET cluster_id = ? WHERE id IN (${placeholders})`)
          .bind(clusterId, ...cluster.linkedQueryIds)
          .run();
      }

      return clusterId;
    } catch (err) {
      console.error("Failed to save fallback cluster:", err);
      return null;
    }
  },

  /**
   * Fetch saved clusters for display on the Admin UI.
   */
  async getLatestClusters(db: D1Database, limit: number = 30) {
    try {
      const { results } = await db
        .prepare(
          `SELECT id, cluster_name, summary, query_count, sample_queries,
                  suggested_action, is_new_category, suggested_category_name,
                  frequency_period, created_at
           FROM fallback_clusters
           ORDER BY created_at DESC
           LIMIT ?`
        )
        .bind(limit)
        .all();

      return (results || []).map((row: any) => ({
        id: row.id,
        cluster_name: row.cluster_name,
        summary: row.summary,
        query_count: row.query_count,
        sample_queries: JSON.parse(row.sample_queries || "[]"),
        suggested_action: row.suggested_action,
        is_new_category: Boolean(row.is_new_category),
        suggested_category_name: row.suggested_category_name,
        frequency_period: row.frequency_period,
        created_at: row.created_at,
      })) as FallbackClusterRecord[];
    } catch (err) {
      console.error("Failed to fetch fallback clusters:", err);
      return [];
    }
  },

  /**
   * Fetch all raw fallback queries belonging to a specific cluster ID.
   */
  async getQueriesForCluster(db: D1Database, clusterId: string) {
    try {
      // 1. Fetch cluster sample queries for fallback matching
      const clusterRow = await db
        .prepare(`SELECT sample_queries FROM fallback_clusters WHERE id = ?`)
        .bind(clusterId)
        .first<{ sample_queries: string }>();

      let sampleQueries: string[] = [];
      if (clusterRow?.sample_queries) {
        try { sampleQueries = JSON.parse(clusterRow.sample_queries); } catch {}
      }

      // 2. Fetch queries explicitly assigned to cluster_id
      const { results } = await db
        .prepare(
          `SELECT id, thread_id, user_id, query_text, reason, created_at
           FROM fallback_queries
           WHERE cluster_id = ?
           ORDER BY created_at DESC`
        )
        .bind(clusterId)
        .all();

      let queries = (results || []) as unknown as FallbackQueryRecord[];

      // 3. Fallback: If queries count is smaller than sample queries, search by query_text
      if (sampleQueries.length > 0) {
        const existingTexts = new Set(queries.map(q => q.query_text.trim().toLowerCase()));
        
        for (const sampleText of sampleQueries) {
          if (!sampleText || !sampleText.trim()) continue;
          if (!existingTexts.has(sampleText.trim().toLowerCase())) {
            const matchRow = await db
              .prepare(
                `SELECT id, thread_id, user_id, query_text, reason, created_at
                 FROM fallback_queries
                 WHERE LOWER(query_text) = LOWER(?)
                 ORDER BY created_at DESC LIMIT 1`
              )
              .bind(sampleText.trim())
              .first<FallbackQueryRecord>();

            if (matchRow) {
              queries.push(matchRow);
              existingTexts.add(matchRow.query_text.trim().toLowerCase());
            } else {
              // Synthesize record if sample query was logged directly inside cluster JSON
              queries.push({
                id: nanoid(),
                thread_id: null,
                user_id: "system_sample",
                query_text: sampleText,
                reason: "sample_fallback",
                created_at: new Date().toISOString(),
              });
              existingTexts.add(sampleText.trim().toLowerCase());
            }
          }
        }
      }

      return queries;
    } catch (err) {
      console.error("Failed to fetch queries for cluster:", err);
      return [];
    }
  },

  /**
   * Get total count of unclustered fallback queries.
   */
  async getUnclusteredCount(db: D1Database) {
    try {
      const row = await db
        .prepare(`SELECT COUNT(*) as total FROM fallback_queries WHERE cluster_id IS NULL`)
        .first<{ total: number }>();
      return row?.total || 0;
    } catch {
      return 0;
    }
  }
};
