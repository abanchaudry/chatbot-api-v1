import OpenAI from "openai";
import { renderPdfPageToImageBuffer } from "../../utils/rasterize.js";
import { ContentBlock, ProcessOptions, BlockType } from "../../types.js";

export async function extractVisionPdfPage(
  pdfBuffer: Buffer,
  pageNumber: number, // 1-based
  options?: ProcessOptions
): Promise<ContentBlock[]> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
  const dpi = options?.maxDpi || 150;

  const imageBuffer = await renderPdfPageToImageBuffer(pdfBuffer, pageNumber, dpi);
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64Image}`;

  if (!apiKey) {
    return [
      {
        id: `ocr_fallback_${pageNumber}`,
        type: "paragraph",
        content: `[Vision Fallback (No OpenAI Key Provided)] Extracted page ${pageNumber} via visual rendering.`,
        boundingBox: [100, 100, 900, 900],
        sourceMethod: "ocr",
        confidence: 0.8,
        pageNumber,
      },
    ];
  }

  const openai = new OpenAI({ apiKey });
  const model = options?.model || "gpt-4o";

  const prompt = `Analyze this document page image with maximum accuracy. Extract all layout content blocks strictly adhering to the JSON schema.`;

  const jsonSchema = {
    name: "document_page_blocks",
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
                description: "Text content or JSON-encoded string for tables/charts",
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

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl, detail: dpi > 200 ? "high" : "auto" } },
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
  if (!messageContent) {
    throw new Error(`OpenAI Vision response was empty for page ${pageNumber}`);
  }

  const parsed = JSON.parse(messageContent);
  const rawBlocks = parsed.blocks || [];

  const blocks: ContentBlock[] = rawBlocks.map((b: any, idx: number) => {
    let parsedContent: string | Record<string, unknown> = b.content;
    if (b.type === "table" || b.type === "chart" || b.type === "figure") {
      try {
        parsedContent = JSON.parse(b.content);
      } catch {
        parsedContent = b.content;
      }
    }

    return {
      id: `ocr_${pageNumber}_${idx}`,
      type: b.type as BlockType,
      content: parsedContent,
      boundingBox: [b.ymin, b.xmin, b.ymax, b.xmax],
      sourceMethod: "ocr",
      confidence: typeof b.confidence === "number" ? Math.max(0, Math.min(1, b.confidence)) : 0.9,
      pageNumber,
    };
  });

  return blocks;
}
