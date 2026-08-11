// src/v1/services/fallback-clustering.service.ts
import OpenAI from "openai";
import type { Env } from "../types/env";
import { fallbackDb } from "./db/fallback.db";

export interface ClusterOutput {
  id: string;
  name: string;
  summary: string;
  queryCount: number;
  sampleQueries: string[];
  suggestedAction: string;
  isNewCategory: boolean;
  suggestedCategoryName?: string;
  frequencyPeriod: "daily" | "weekly" | "monthly" | "manual";
}

export interface ClusteringOptions {
  period?: "daily" | "weekly" | "monthly" | "manual";
  startDate?: string;
  endDate?: string;
  recluster?: boolean;
  unclusteredOnly?: boolean;
}

export async function runFallbackClustering(
  env: Env,
  opts: ClusteringOptions | "daily" | "weekly" | "monthly" | "manual" = "weekly"
): Promise<{ success: boolean; message: string; clustersCount: number; queriesProcessed: number }> {
  const options: ClusteringOptions = typeof opts === "string" ? { period: opts } : opts || {};
  const period = options.period || "manual";

  const apiKey = (env as any).OPENAI_API_KEY || (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : "");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  // 0. If recluster is true, reset cluster_id for the specified date range first
  if (options.recluster) {
    await fallbackDb.resetClusterIdsForDateRange(env.DB, {
      startDate: options.startDate,
      endDate: options.endDate,
    });
  }

  // 1. Fetch fallback queries by filter & existing categories
  const [unclustered, existingClusters] = await Promise.all([
    fallbackDb.getFallbackQueriesByFilter(env.DB, {
      startDate: options.startDate,
      endDate: options.endDate,
      unclusteredOnly: options.recluster ? false : (options.unclusteredOnly !== false),
    }),
    fallbackDb.getLatestClusters(env.DB, 50).catch(() => [])
  ]);

  if (unclustered.length === 0) {
    return {
      success: true,
      message: `No matching fallback queries found for clustering.`,
      clustersCount: 0,
      queriesProcessed: 0,
    };
  }

  // Extract existing category names
  const existingCategoryNames = Array.from(
    new Set(
      existingClusters
        .map((c: any) => c.suggested_category_name || c.cluster_name)
        .filter(Boolean)
    )
  );

  const existingCategoriesContext = existingCategoryNames.length > 0
    ? `Existing System Categories: [${existingCategoryNames.join(", ")}]`
    : `Existing System Categories: [Legal_Regulatory, Financial_Tabular, FAQ_Knowledgebase, Code_Technical]`;

  // 2. Format input queries for OpenAI
  const queryListText = unclustered
    .map((q, idx) => `[ID: ${q.id}] Query #${idx + 1}: "${q.query_text}"`)
    .join("\n");

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert AI Observability & Knowledge Gap Analyst for an Enterprise RAG system.
Your task is to analyze raw user queries that resulted in FALLBACK answers (where the system had insufficient knowledge) and cluster them into 5 to 15 meaningful semantic topic groups.

${existingCategoriesContext}

For each cluster output a JSON object containing:
1. "name": A concise, professional topic category title (e.g., "Solar Panel Warranty Period", "Contractor License Renewal Requirements").
2. "summary": A 1-2 sentence explanation of what users were looking for in this cluster.
3. "sampleQueries": A list of 3 to 5 representative user query strings.
4. "suggestedAction": A specific recommendation for the Knowledge Base administrator (e.g., "Upload policy document covering Chapter 624 renewal fees and deadline rules").
5. "isNewCategory": true if this cluster represents a brand-new domain topic NOT covered by the ${existingCategoriesContext}, otherwise false.
6. "suggestedCategoryName": If isNewCategory is true, a clean PascalCase or snake_case category identifier (e.g. "Solar_Warranty_Policy"). If it matches an existing category, provide that existing category name.
7. "linkedQueryIds": An array of raw ID strings from the prompt input list matching this cluster.

Respond ONLY with raw JSON matching this schema:
{
  "clusters": [
    {
      "name": "string",
      "summary": "string",
      "sampleQueries": ["string"],
      "suggestedAction": "string",
      "isNewCategory": boolean,
      "suggestedCategoryName": "string" | null,
      "linkedQueryIds": ["string"]
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the list of fallback user queries to analyze and cluster:\n\n${queryListText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const rawClusters = parsed.clusters || [];

    let savedCount = 0;

    for (const cl of rawClusters) {
      const queryIds = Array.isArray(cl.linkedQueryIds) ? cl.linkedQueryIds : [];
      await fallbackDb.saveCluster(env.DB, {
        name: cl.name || "General Knowledge Gap",
        summary: cl.summary || "Unresolved user queries requiring knowledgebase updates.",
        queryCount: queryIds.length || cl.sampleQueries?.length || 1,
        sampleQueries: cl.sampleQueries || [],
        suggestedAction: cl.suggestedAction || "Review user queries and add relevant policy documents.",
        isNewCategory: Boolean(cl.isNewCategory),
        suggestedCategoryName: cl.suggestedCategoryName || undefined,
        frequencyPeriod: period,
        linkedQueryIds: queryIds,
      });
      savedCount++;
    }

    return {
      success: true,
      message: `Successfully clustered ${unclustered.length} fallback queries into ${savedCount} topic groups.`,
      clustersCount: savedCount,
      queriesProcessed: unclustered.length,
    };
  } catch (err: any) {
    console.error("Fallback clustering error:", err);
    throw new Error(`LLM Clustering failed: ${err.message}`);
  }
}
