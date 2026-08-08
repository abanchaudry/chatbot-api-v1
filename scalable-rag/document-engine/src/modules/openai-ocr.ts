import OpenAI from "openai";
import { PreprocessedImage } from "./image-preprocessor.js";
import { ContentBlock, ProcessOptions, BlockType } from "../types.js";

export interface OCRPageResult {
  pageNumber: number;
  blocks: ContentBlock[];
  rawText: string;
}

export async function performOpenAIVisionOCR(
  images: PreprocessedImage[],
  options?: ProcessOptions
): Promise<OCRPageResult[]> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Offline / Mock OCR fallback for testing without API keys
    return images.map((img) => ({
      pageNumber: img.pageNumber,
      blocks: [
        {
          id: `ocr_fallback_${img.pageNumber}`,
          type: "paragraph",
          content: `[OpenAI Vision OCR Fallback - No Key] Page ${img.pageNumber} OCR processing skipped.`,
          boundingBox: [100, 100, 900, 900],
          sourceMethod: "ocr",
          confidence: 0.8,
          pageNumber: img.pageNumber,
        },
      ],
      rawText: `[OpenAI Vision OCR Fallback - No Key] Page ${img.pageNumber}`,
    }));
  }

  const openai = new OpenAI({ apiKey });
  const model = options?.model || "gpt-4o";

  const systemPrompt = `You are a high-precision OCR and document structure engine.
Your task is to transcribe and extract all content from this visual page with maximum precision:

Strict Guidelines:
1. Extract EVERY visible character verbatim. Never summarize.
2. Preserve natural reading order from top to bottom, left to right.
3. Preserve headings, paragraphs, bullet lists, and code blocks exactly as written.
4. Convert any visual tables into clean Markdown tables (| Header | Header |).
5. Describe figures and charts in separate paragraphs with captions preserved.
6. Preserve mathematical equations in LaTeX format ($...$ or $$...$$).
7. Never hallucinate missing text or make assumptions.`;

  const jsonSchema = {
    name: "ocr_page_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "paragraph",
                  "heading",
                  "table",
                  "figure",
                  "chart",
                  "equation",
                  "code",
                  "list",
                ],
              },
              content: {
                type: "string",
                description: "Verbatim text, markdown table, or code snippet",
              },
              ymin: { type: "integer" },
              xmin: { type: "integer" },
              ymax: { type: "integer" },
              xmax: { type: "integer" },
              confidence: { type: "number" },
            },
            required: ["type", "content", "ymin", "xmin", "ymax", "xmax", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["blocks"],
      additionalProperties: false,
    },
  };

  const ocrResults: OCRPageResult[] = [];

  for (const img of images) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Perform OCR on page ${img.pageNumber}. Output strict JSON blocks.` },
              { type: "image_url", image_url: { url: img.dataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
        temperature: 0.1,
      });

      const messageContent = response.choices[0]?.message?.content;
      const parsed = messageContent ? JSON.parse(messageContent) : { blocks: [] };

      const blocks: ContentBlock[] = (parsed.blocks || []).map((b: any, idx: number) => ({
        id: `ocr_${img.pageNumber}_${idx}`,
        type: b.type as BlockType,
        content: b.content,
        boundingBox: [b.ymin, b.xmin, b.ymax, b.xmax],
        sourceMethod: "ocr",
        confidence: typeof b.confidence === "number" ? Math.max(0, Math.min(1, b.confidence)) : 0.9,
        pageNumber: img.pageNumber,
      }));

      const rawText = blocks.map((b) => (typeof b.content === "string" ? b.content : "")).join("\n\n");

      ocrResults.push({
        pageNumber: img.pageNumber,
        blocks,
        rawText,
      });
    } catch (err: any) {
      console.error(`OCR processing failed for page ${img.pageNumber}:`, err);
      ocrResults.push({
        pageNumber: img.pageNumber,
        blocks: [
          {
            id: `ocr_err_${img.pageNumber}`,
            type: "paragraph",
            content: `[OCR Error: ${err.message}]`,
            sourceMethod: "ocr",
            confidence: 0.0,
            pageNumber: img.pageNumber,
          },
        ],
        rawText: `[OCR Error] Page ${img.pageNumber}`,
      });
    }
  }

  return ocrResults;
}
