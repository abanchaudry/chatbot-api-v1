import OpenAI from "openai";
import { StructuredDocument, ProcessOptions } from "../types.js";

export interface AIValidationResult {
  aiValidationRan: boolean;
  confidenceScore: number; // 0 - 100%
  aiWarnings: string[];
  aiSuggestedCorrections: string[];
}

export async function runAIValidation(
  doc: StructuredDocument,
  options?: ProcessOptions
): Promise<AIValidationResult> {
  const isEnabled =
    options?.validationMode === "ai" || options?.enableLLMValidation === true;

  if (!isEnabled) {
    return {
      aiValidationRan: false,
      confidenceScore: 100,
      aiWarnings: [],
      aiSuggestedCorrections: [],
    };
  }

  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      aiValidationRan: true,
      confidenceScore: 85,
      aiWarnings: ["AI Validation requested, but no OpenAI API key provided. Defaulting score to 85%."],
      aiSuggestedCorrections: [],
    };
  }

  const openai = new OpenAI({ apiKey });
  const model = options?.model || "gpt-4o";

  const summaryPayload = {
    documentId: doc.documentId,
    documentType: doc.documentType,
    pageCount: doc.metadata.pageCount,
    paragraphsCount: doc.paragraphs.length,
    tablesCount: doc.tables.length,
    figuresCount: doc.figures.length,
    codeBlocksCount: doc.codeBlocks.length,
    ruleIssues: doc.validationReport.ruleIssues,
    sampleParagraphs: doc.paragraphs.slice(0, 5).map((p) => p.text),
  };

  const systemPrompt = `You are a Document Intelligence Auditor.
Compare the extracted document structures with typical document invariants. Identify any:
- Missing text or missing tables/figures
- Incorrect numbers or ordering
- OCR mistakes or semantic inconsistencies
- Hallucinated content

Output strictly in JSON format:
{
  "confidenceScore": number (0 to 100),
  "warnings": string[],
  "suggestedCorrections": string[]
}`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Audit extracted document payload:\n${JSON.stringify(summaryPayload, null, 2)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};

    return {
      aiValidationRan: true,
      confidenceScore: typeof parsed.confidenceScore === "number" ? Math.max(0, Math.min(100, parsed.confidenceScore)) : 90,
      aiWarnings: parsed.warnings || [],
      aiSuggestedCorrections: parsed.suggestedCorrections || [],
    };
  } catch (err: any) {
    return {
      aiValidationRan: true,
      confidenceScore: 80,
      aiWarnings: [`AI Validation error: ${err.message}`],
      aiSuggestedCorrections: [],
    };
  }
}
