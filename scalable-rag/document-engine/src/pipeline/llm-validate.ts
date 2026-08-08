import OpenAI from "openai";
import { StructuredDocument, ProcessOptions } from "../types.js";

export interface LLMValidationOutput {
  ran: boolean;
  notes?: string;
  suggestedRetriesPageNumbers?: number[];
}

export async function runLLMValidationSpotCheck(
  doc: StructuredDocument,
  options?: ProcessOptions
): Promise<LLMValidationOutput> {
  if (!options?.enableLLMValidation) {
    return { ran: false };
  }

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ran: true,
      notes: "LLM validation requested, but no OpenAI API key provided. Spot-check skipped gracefully.",
    };
  }

  // Identify low-confidence or potentially ambiguous blocks for spot-checking
  const suspectBlocks: Array<{ pageNumber: number; blockType: string; snippet: string }> = [];

  for (const page of doc.pages) {
    for (const block of page.blocks) {
      if (block.confidence < 0.85 || typeof block.content !== "string") {
        const snippet =
          typeof block.content === "string"
            ? block.content.slice(0, 100)
            : JSON.stringify(block.content).slice(0, 100);

        suspectBlocks.push({
          pageNumber: page.pageNumber,
          blockType: block.type,
          snippet,
        });
      }
    }
  }

  if (suspectBlocks.length === 0) {
    return {
      ran: true,
      notes: "Spot-check complete: All blocks met high confidence threshold (>= 0.85). No anomalies detected.",
    };
  }

  const openai = new OpenAI({ apiKey });
  const model = options.model || "gpt-4o";

  const prompt = `Spot-check validation request for Document ID '${doc.documentId}':
The following ${suspectBlocks.length} content blocks were flagged for low confidence:
${JSON.stringify(suspectBlocks, null, 2)}

Provide a concise assessment (2-3 sentences) on structural consistency and flag any pages requiring retry.`;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.1,
    });

    const notes = response.choices[0]?.message?.content || "Spot-check completed.";
    return {
      ran: true,
      notes,
    };
  } catch (err: any) {
    return {
      ran: true,
      notes: `LLM validation encountered error: ${err.message}`,
    };
  }
}
