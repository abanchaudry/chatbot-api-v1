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

/**
 * Pass 1 (Mapper Phase): Parallel LLM Micro-Clustering
 * Slices raw queries into chunks of ~40 queries and extracts semantically pure micro-topics using gpt-4o-mini.
 */
async function runMapperPhase(
  openai: OpenAI,
  records: any[]
): Promise<Array<{ microTopic: string; sampleQueries: string[]; queryIds: string[] }>> {
  const chunkSize = 40;
  const chunks: any[][] = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    chunks.push(records.slice(i, i + chunkSize));
  }

  const mapperPrompt = `You are an expert Mapper AI for an Enterprise RAG Fallback System.
Analyze the provided batch of raw user fallback queries and group them into semantically pure micro-topics based on underlying user intent.

For each micro-topic output:
1. "microTopic": A concise 2-4 word topic title (e.g. "EV Charging Cables", "Deep Sea Mining Fees").
2. "sampleQueries": 2-4 representative user query strings.
3. "linkedIds": An array of raw ID strings from the prompt input list matching this topic.

Respond ONLY with raw JSON matching:
{
  "microTopics": [
    {
      "microTopic": "string",
      "sampleQueries": ["string"],
      "linkedIds": ["string"]
    }
  ]
}`;

  const mapperPromises = chunks.map(async (chunk) => {
    const textList = chunk.map((q, idx) => `[ID: ${q.id}] "${q.query_text}"`).join("\n");
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: mapperPrompt },
          { role: "user", content: `Raw user queries batch:\n\n${textList}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
      return parsed.microTopics || [];
    } catch (e) {
      console.error("Mapper chunk failed:", e);
      return [];
    }
  });

  const mapperResults = await Promise.all(mapperPromises);
  const allMicroTopics: Array<{ microTopic: string; sampleQueries: string[]; queryIds: string[] }> = [];

  for (const list of mapperResults) {
    for (const item of list) {
      allMicroTopics.push({
        microTopic: item.microTopic || "General Knowledge Gap",
        sampleQueries: Array.isArray(item.sampleQueries) ? item.sampleQueries : [],
        queryIds: Array.isArray(item.linkedIds) ? item.linkedIds : [],
      });
    }
  }

  return allMicroTopics;
}

export async function runFallbackClustering(
  env: Env["Bindings"],
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
      limit: 100000,
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

  const openai = new OpenAI({ apiKey });

  let rawClusters: any[] = [];
  const bucketToQueryIdsMap = new Map<string, string[]>();

  if (unclustered.length <= 30) {
    // Single-Pass Direct LLM Clustering for Small Batches (< 30 queries)
    const queryListText = unclustered
      .map((q, idx) => `[ID: ${q.id}] Query #${idx + 1}: "${q.query_text}"`)
      .join("\n");

    const singlePassPrompt = `You are an expert AI Observability & Knowledge Gap Analyst for an Enterprise RAG system.
Analyze raw user queries that resulted in FALLBACK answers and cluster them into 5 to 15 meaningful semantic topic categories.

${existingCategoriesContext}

For each output topic category, return a JSON object containing:
1. "name": A concise, professional topic category title (e.g., "Solar Panel Warranty Period", "Contractor License Renewal Requirements").
2. "summary": A 1-2 sentence explanation of what users were looking for in this topic.
3. "sampleQueries": A list of 3 to 5 representative user query strings.
4. "suggestedAction": A specific recommendation for the Knowledge Base administrator (e.g., "Upload policy document covering Chapter 624 renewal fees and deadline rules").
5. "isNewCategory": true if this cluster represents a brand-new domain topic NOT covered by the ${existingCategoriesContext}, otherwise false.
6. "suggestedCategoryName": If isNewCategory is true, a clean PascalCase or snake_case category identifier (e.g. "Solar_Warranty_Policy"). If it matches an existing category from ${existingCategoriesContext}, provide that exact existing category name.
7. "linkedQueryIds": An array of raw ID strings from the prompt input list matching this cluster.

Respond ONLY with raw JSON matching:
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: singlePassPrompt },
        { role: "user", content: `Here is the list of fallback user queries to analyze and cluster:\n\n${queryListText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    rawClusters = parsed.clusters || [];

    for (const q of unclustered) {
      bucketToQueryIdsMap.set(q.id, [q.id]);
    }
  } else {
    // 2-Pass Method B: Parallel Mapper LLM + Reducer LLM Pipeline (High Scale 100k+)
    console.log(`Executing Method B: Parallel 2-Pass Map-Reduce LLM Pipeline on ${unclustered.length} queries...`);

    // Pass 1: Parallel Mapper LLM Micro-Clustering
    const microTopics = await runMapperPhase(openai, unclustered);

    // Format Micro-Topics for Reducer Phase
    const microTopicListText = microTopics
      .map((mt, idx) => `[TopicIndex: ${idx}] Topic: "${mt.microTopic}" (Volume: ${mt.queryIds.length})\nSamples:\n` + mt.sampleQueries.map(s => ` - "${s}"`).join("\n"))
      .join("\n\n---\n\n");

    for (let idx = 0; idx < microTopics.length; idx++) {
      bucketToQueryIdsMap.set(String(idx), microTopics[idx].queryIds);
    }

    // Pass 2: Reducer LLM Consolidator
    const reducerPrompt = `You are an expert Reducer AI for an Enterprise RAG Fallback System.
Review the intermediate micro-topics generated by the Mapper phase and consolidate them into 5 to 15 final topic categories.

${existingCategoriesContext}

For each final output topic category, return a JSON object containing:
1. "name": A concise, professional topic category title.
2. "summary": A 1-2 sentence explanation of what users were looking for in this topic.
3. "sampleQueries": A list of 3 to 5 representative user query strings.
4. "suggestedAction": A specific recommendation for the Knowledge Base administrator.
5. "isNewCategory": true if this cluster represents a brand-new domain topic NOT covered by ${existingCategoriesContext}, otherwise false.
6. "suggestedCategoryName": If isNewCategory is true, a clean PascalCase or snake_case category identifier. If it matches an existing category from ${existingCategoriesContext}, provide that exact existing category name.
7. "linkedTopicIndexes": An array of TopicIndex numbers from the prompt input list matching this cluster (e.g. [0, 2, 4]).

Respond ONLY with raw JSON matching:
{
  "clusters": [
    {
      "name": "string",
      "summary": "string",
      "sampleQueries": ["string"],
      "suggestedAction": "string",
      "isNewCategory": boolean,
      "suggestedCategoryName": "string" | null,
      "linkedTopicIndexes": [number]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: reducerPrompt },
        { role: "user", content: `Intermediate Micro-Topics to consolidate:\n\n${microTopicListText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    rawClusters = parsed.clusters || [];
  }

  let savedCount = 0;

  for (const cl of rawClusters) {
    const topicIndexes = Array.isArray(cl.linkedTopicIndexes) ? cl.linkedTopicIndexes : [];
    const directQueryIds = Array.isArray(cl.linkedQueryIds) ? cl.linkedQueryIds : [];

    let linkedQueryIds: string[] = [];

    if (directQueryIds.length > 0) {
      linkedQueryIds = directQueryIds;
    } else if (topicIndexes.length > 0) {
      for (const idx of topicIndexes) {
        const qIds = bucketToQueryIdsMap.get(String(idx)) || [];
        linkedQueryIds.push(...qIds);
      }
    }

    if (linkedQueryIds.length === 0) {
      linkedQueryIds = unclustered.map(u => u.id);
    }

    await fallbackDb.saveCluster(env.DB, {
      name: cl.name || "General Knowledge Gap",
      summary: cl.summary || "Unresolved user queries requiring knowledgebase updates.",
      queryCount: linkedQueryIds.length,
      sampleQueries: cl.sampleQueries || [],
      suggestedAction: cl.suggestedAction || "Review user queries and add relevant policy documents.",
      isNewCategory: Boolean(cl.isNewCategory),
      suggestedCategoryName: cl.suggestedCategoryName || undefined,
      frequencyPeriod: period,
      linkedQueryIds: linkedQueryIds,
    });
    savedCount++;
  }

  return {
    success: true,
    message: `Successfully clustered ${unclustered.length} fallback queries into ${savedCount} topic groups via Method B (Parallel Map-Reduce LLM).`,
    clustersCount: savedCount,
    queriesProcessed: unclustered.length,
  };
}
