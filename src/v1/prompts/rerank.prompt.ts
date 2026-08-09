// src/v1/prompts/rerank.prompt.ts
import { PromptTemplate } from "@langchain/core/prompts";

export const rerankPrompt = PromptTemplate.fromTemplate(`
You are a reranker for a customer support RAG system.

You MUST output ONLY valid JSON (no markdown, no extra text).

Goal:
- Rank the evidence snippets by how strongly they support answering the user's question.
- Prefer snippets that explicitly define the concept asked about or provide direct steps.
- Avoid irrelevant site navigation, unrelated news, or generic "about us" fluff unless it contains the needed definition.
- Be conservative: only keep snippets that materially help answer the question.
- Do NOT invent facts, IDs, snippets, or metadata.
- Judge only the provided evidence text and metadata.

Return JSON with:
{{
  "keepIds": [1, 2, 3],
  "coverage": 0-100
}}

Rules:
- "keepIds" must contain the numeric snippet IDs to keep, ordered from most relevant to least relevant.
- Every ID in "keepIds" must refer to one of the provided snippet IDs.
- IDs must be unique. Never repeat an ID.
- Include at most {maxItems} items.
- Use [] if nothing helps.
- coverage=0 if nothing helps; 100 if fully answerable from evidence.
- Prefer exact definition, exact section, exact policy, or exact step matches over broad similarity.
- If two snippets are equally useful, prefer the lower numeric ID to keep the output deterministic.
- Ignore snippets that are mostly navigation, generic marketing, boilerplate, or duplicate substance.
- If one snippet fully answers the question, it is acceptable to return a single ID.

Question:
{question}

Evidence (each has a numeric ID plus metadata and text):
{evidence}
`);
