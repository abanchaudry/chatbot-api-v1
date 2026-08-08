import OpenAI from "openai";
import { SoMTaggedPage, SoMTagItem } from "./som-tagger.js";
import { ContentBlock, ProcessOptions, BlockType } from "../types.js";

export interface SoMVisionPageResult {
  pageNumber: number;
  blocks: ContentBlock[];
}

export async function processSoMVisionPage(
  somPage: SoMTaggedPage,
  options?: ProcessOptions
): Promise<SoMVisionPageResult> {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const blocks: ContentBlock[] = somPage.tags.map((t, idx) => ({
      id: `som_block_${somPage.pageNumber}_${idx}`,
      type: t.type,
      content: t.draftContent,
      boundingBox: t.boundingBox,
      sourceMethod: "ocr",
      confidence: 0.9,
      pageNumber: somPage.pageNumber,
    }));

    return { pageNumber: somPage.pageNumber, blocks };
  }

  const openai = new OpenAI({ apiKey });
  const model = options?.model || "gpt-4o";

  const systemPrompt = `You are a High-Precision Document Intelligence & Multimodal Vision Engine.
Analyze the provided page image with overlaid color-coded bounding boxes and visual badge tags ([P-01], [C-01], [H-01], [T-01], [E-01], [F-01]).

CRITICAL INSTRUCTIONS:
1. Transcribe the ACTUAL visual text and layout content visible on the page image with 100% precision.
2. NEVER invent, hallucinate, or insert example tables, sample text, or character entities that are NOT visibly present on the image.
3. If a region contains a table, set type to "table" and format it as a clean Markdown table (| Header 1 | Header 2 |) using the EXACT text visible on the image.
4. Extract headings as "heading", paragraphs as "paragraph", lists as "list", code blocks as "code", figures/diagrams as "figure", math as "equation".
5. Match each extracted block to its visual tag ID ([P-01], [H-01], [T-01], etc.) from the reference map.
6. Output strict JSON conforming to the PageDOM schema.`;

  const pageDomSchema = {
    name: "PageDOM",
    strict: true,
    schema: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tagId: { type: "string", description: "Reference badge tag ID e.g. [P-01], [C-01], [T-01], [H-01]" },
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
                description: "Verbatim transcribed text, Markdown table, LaTeX string, or code snippet",
              },
              columnGroup: { type: "integer", description: "1 for left column/main, 2 for right column/sidebar" },
              confidence: { type: "number" },
            },
            required: ["tagId", "type", "content", "columnGroup", "confidence"],
            additionalProperties: false,
          },
        },
      },
      required: ["blocks"],
      additionalProperties: false,
    },
  };

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transcribe and structure the visual content of Page ${somPage.pageNumber} strictly matching the visible image and reference tags:\n\n${somPage.referenceMapText}`,
            },
            {
              type: "image_url",
              image_url: { url: somPage.somDataUrl, detail: "high" },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: pageDomSchema,
      },
      temperature: 0.1,
    });

    const messageContent = response.choices[0]?.message?.content;
    const parsed = messageContent ? JSON.parse(messageContent) : { blocks: [] };

    const tagLookup = new Map<string, SoMTagItem>();
    somPage.tags.forEach((t) => tagLookup.set(t.tagId, t));

    const blocks: ContentBlock[] = (parsed.blocks || []).map((b: any, idx: number) => {
      const matchedTag = tagLookup.get(b.tagId);
      const boundingBox = matchedTag ? matchedTag.boundingBox : [100, 100, 900, 900];

      return {
        id: `som_dom_${somPage.pageNumber}_${idx}`,
        type: b.type as BlockType,
        content: b.content,
        boundingBox,
        sourceMethod: "ocr",
        confidence: typeof b.confidence === "number" ? Math.max(0, Math.min(1, b.confidence)) : 0.95,
        pageNumber: somPage.pageNumber,
      };
    });

    return {
      pageNumber: somPage.pageNumber,
      blocks,
    };
  } catch (err: any) {
    console.error(`[SoM Vision] OpenAI processing error for page ${somPage.pageNumber}:`, err);
    const fallbackBlocks: ContentBlock[] = somPage.tags.map((t, idx) => ({
      id: `som_err_${somPage.pageNumber}_${idx}`,
      type: t.type,
      content: t.draftContent,
      boundingBox: t.boundingBox,
      sourceMethod: "ocr",
      confidence: 0.8,
      pageNumber: somPage.pageNumber,
    }));

    return { pageNumber: somPage.pageNumber, blocks: fallbackBlocks };
  }
}
