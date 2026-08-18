import type OpenAI from "openai";

export type ClassificationCategory =
  | "Code_Technical"
  | "Financial_Tabular"
  | "Legal_Regulatory"
  | "FAQ_Knowledgebase"
  | "Medical_Scientific"
  | "Form_KeyValue"
  | "Prose_Standard";

export interface ClassificationResult {
  category: ClassificationCategory;
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
  suggestedChunkingStrategy?: string;
}

/**
 * Production Document Classifier
 * Analyzes sample text with gpt-4o-mini and returns classification,
 * confidence score, reasoning, suggested custom category, and chunking strategy.
 */
export async function classifyDocument(
  openai: OpenAI,
  text: string,
  filename: string
): Promise<ClassificationResult> {
  const sample = text.slice(0, 2500);

  const systemPrompt = `You are an expert document classifier and chunking architect for an enterprise RAG system.
Your task is to analyze the document sample and output a strict JSON object with:
1. "category": Exactly ONE of:
   - "Code_Technical" (source code, API specs, developer docs, JSON/YAML schemas, technical code blocks)
   - "Financial_Tabular" (balance sheets, financial reports, CSVs, matrix data, price tables)
   - "Legal_Regulatory" (contracts, statutes, terms of service, policies, numbered clauses like 1.1, Section 4)
   - "FAQ_Knowledgebase" (question-and-answer pairs, helpdesk guides, troubleshooting Q&A)
   - "Medical_Scientific" (research papers, clinical studies, journal papers with Abstract/Methods/Results)
   - "Form_KeyValue" (registration forms, applications, key-value metadata field records)
   - "Prose_Standard" (articles, blog posts, books, standard narrative documentation)
2. "confidence": A float between 0.00 and 1.00 representing classification certainty.
3. "reasoning": A 1-sentence explanation of why this document matches the chosen category.
4. "suggestedCategory": If confidence is below 0.70, suggest a more accurate custom taxonomy category name (e.g., "empty_document", "log_file", "medical_prescription"). Otherwise null.
5. "suggestedChunkingStrategy": If confidence is below 0.70 or a custom category is proposed, recommend the ideal custom chunking strategy rule (e.g. "Q&A pair preservation", "Table header retention per row", "Atomic code block preservation", "Section/Clause boundary splitting", "KeyValue field grouping"). Otherwise null.

Respond ONLY with raw JSON matching this schema:
{
  "category": "Code_Technical" | "Financial_Tabular" | "Legal_Regulatory" | "FAQ_Knowledgebase" | "Medical_Scientific" | "Form_KeyValue" | "Prose_Standard",
  "confidence": number,
  "reasoning": string,
  "suggestedCategory": string | null,
  "suggestedChunkingStrategy": string | null
}`;

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Filename: ${filename}\n\nDocument Sample:\n${sample}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 256,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Classification timeout")), 5000))
    ]);

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const validCategories: ClassificationCategory[] = [
      "Code_Technical",
      "Financial_Tabular",
      "Legal_Regulatory",
      "FAQ_Knowledgebase",
      "Medical_Scientific",
      "Form_KeyValue",
      "Prose_Standard",
    ];

    const category: ClassificationCategory = validCategories.includes(parsed.category)
      ? parsed.category
      : "Prose_Standard";

    const confidence = typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.85;

    return {
      category,
      confidence,
      reasoning: parsed.reasoning || `Classified as ${category} based on document structure.`,
      suggestedCategory: confidence < 0.70 && parsed.suggestedCategory ? parsed.suggestedCategory : undefined,
      suggestedChunkingStrategy: confidence < 0.70 && parsed.suggestedChunkingStrategy ? parsed.suggestedChunkingStrategy : undefined,
    };
  } catch (err) {
    console.warn("Classification fallback note:", err);
    // Regex heuristic fallback if LLM classification fails
    return heuristicClassify(text, filename);
  }
}

/**
 * Fast Regex Heuristic Fallback Classifier
 */
function heuristicClassify(text: string, filename: string): ClassificationResult {
  const lower = text.toLowerCase();
  const fileExt = filename.split(".").pop()?.toLowerCase() ?? "";

  if (fileExt === "csv" || (text.includes("|") && text.includes("---"))) {
    return { category: "Financial_Tabular", confidence: 0.9, reasoning: "Contains tabular data matrix structures." };
  }
  if (/(```(javascript|typescript|python|html|css|json|yaml|sql|cpp|java|go|rust)\b|\bfunction\b|\bconst\b|\bimport\b)/i.test(text)) {
    return { category: "Code_Technical", confidence: 0.95, reasoning: "Contains programming syntax and code blocks." };
  }
  if (/(\bQ:|\bQuestion:|\bFAQ\b|\bTroubleshooting\b)/i.test(text)) {
    return { category: "FAQ_Knowledgebase", confidence: 0.92, reasoning: "Contains Question and Answer pattern structure." };
  }
  if (/(\bSection \d|\bClause \d|\bNRS \d|\bLCB File|\bPursuant to\b|\bTerms and Conditions\b)/i.test(text)) {
    return { category: "Legal_Regulatory", confidence: 0.9, reasoning: "Contains legal statutes, clauses, and regulations." };
  }
  if (/(\bAbstract\b|\bMethods\b|\bResults\b|\bDiscussion\b|\bReferences\b)/i.test(text)) {
    return { category: "Medical_Scientific", confidence: 0.88, reasoning: "Contains scientific research paper structure." };
  }
  if (/(:\s*[A-Z0-9].*\n){3,}/i.test(text)) {
    return { category: "Form_KeyValue", confidence: 0.82, reasoning: "Contains key-value record pattern." };
  }

  return { category: "Prose_Standard", confidence: 0.8, reasoning: "Standard narrative prose text." };
}
