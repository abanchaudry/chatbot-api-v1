import OpenAI from "openai";
import { ContentBlock, PageBlock, ProcessOptions, BlockType } from "../../types.js";

export async function extractImage(
  imageBuffer: Buffer,
  options?: ProcessOptions
): Promise<PageBlock[]> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return [
      {
        pageNumber: 1,
        blocks: [
          {
            id: "img_0",
            type: "figure",
            content: "[Standalone Image - Vision Fallback (No OpenAI Key)]",
            boundingBox: [0, 0, 1000, 1000],
            sourceMethod: "ocr",
            confidence: 0.8,
            pageNumber: 1,
          },
        ],
      },
    ];
  }

  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64Image}`;

  const openai = new OpenAI({ apiKey });
  const model = options?.model || "gpt-4o";

  const prompt = `Analyze this image document. Extract all content blocks adhering strictly to JSON Schema.`;

  const jsonSchema = {
    name: "image_document_blocks",
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
              content: { type: "string" },
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
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
  });

  const messageContent = response.choices[0]?.message?.content;
  const parsed = messageContent ? JSON.parse(messageContent) : { blocks: [] };

  const blocks: ContentBlock[] = (parsed.blocks || []).map((b: any, idx: number) => ({
    id: `img_block_${idx}`,
    type: b.type as BlockType,
    content: b.content,
    boundingBox: [b.ymin, b.xmin, b.ymax, b.xmax],
    sourceMethod: "ocr",
    confidence: typeof b.confidence === "number" ? b.confidence : 0.9,
    pageNumber: 1,
  }));

  return [
    {
      pageNumber: 1,
      blocks,
    },
  ];
}
