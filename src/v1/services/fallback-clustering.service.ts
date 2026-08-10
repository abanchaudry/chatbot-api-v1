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

export async function runFallbackClustering(
  env: Env,
  period: "daily" | "weekly" | "monthly" | "manual" = "weekly"
): Promise<{ success: boolean; message: string; clustersCount: number; queriesProcessed: number }> {
  const apiKey = (env as any).OPENAI_API_KEY || (typeof process !== "undefined" ? process.env.OPENAI_API_KEY : "");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const periodDays = period === "daily" ? 1 : period === "monthly" ? 30 : 7;

  // 1. Fetch unclustered fallback queries
  const unclustered = await fallbackDb.getUnclusteredQueries(env.DB, periodDays);

  if (unclustered.length === 0) {
    return {
      success: true,
      message: `No new fallback queries to cluster for ${period} period.`,
      clustersCount: 0,
      queriesProcessed: 0,
    };
  }

  // 2. Format input queries for OpenAI
  const queryListText = unclustered
    .map((q, idx) => `[ID: ${q.id}] Query #${idx + 1}: "${q.query_text}"`)
    .join("\n");

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert AI Observability & Knowledge Gap Analyst for an Enterprise RAG system.
Your task is to analyze raw user queries that resulted in FALLBACK answers (where the system had insufficient knowledge) and cluster them into 5 to 15 meaningful semantic topic groups.

For each cluster output a JSON object containing:
1. "name": A concise, professional topic category title (e.g., "Solar Panel Warranty Period", "Contractor License Renewal Requirements").
2. "summary": A 1-2 sentence explanation of what users were looking for in this cluster.
3. "sampleQueries": A list of 3 to 5 representative user query strings.
4. "suggestedAction": A specific recommendation for the Knowledge Base administrator (e.g., "Upload policy document covering Chapter 624 renewal fees and deadline rules").
5. "isNewCategory": true if this cluster represents a brand-new domain topic not covered by standard documentation categories (e.g. Legal_Regulatory, Financial_Tabular, FAQ_Knowledgebase, Code_Technical), otherwise false.
6. "suggestedCategoryName": If isNewCategory is true, a clean PascalCase or snake_case category identifier (e.g. "Solar_Warranty_Policy"). Otherwise null.
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
