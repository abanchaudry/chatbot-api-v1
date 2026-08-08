import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderPdfPageToImageBuffer } from "../utils/rasterize.js";
import { extractNativePdfPage } from "../pipeline/extractors/native-pdf.js";
import { ContentBlock, BlockType } from "../types.js";

export interface SoMTagItem {
  tagId: string;
  type: BlockType;
  draftContent: string;
  boundingBox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface SoMTaggedPage {
  pageNumber: number;
  somImageBuffer: Buffer;
  somDataUrl: string;
  tags: SoMTagItem[];
  referenceMapText: string;
}

export async function createSetOfMarksTaggedPage(
  inputBuffer: Buffer,
  pageNumber: number,
  dpi: number = 300
): Promise<SoMTaggedPage> {
  const isImage =
    inputBuffer.slice(0, 8).toString("hex").startsWith("89504e47") || // PNG
    inputBuffer.slice(0, 4).toString("hex").startsWith("ffd8ffe0") || // JPEG
    inputBuffer.slice(0, 4).toString("hex").startsWith("ffd8ffe1") ||
    inputBuffer.slice(0, 4).toString("hex").startsWith("ffd8ffe2") ||
    inputBuffer.slice(0, 4).toString("utf8") === "RIFF"; // WEBP

  let baseImage: any;
  let nativeBlocks: ContentBlock[] = [];

  if (isImage) {
    // Standalone Image: load directly via canvas loadImage without PDF.js
    baseImage = await loadImage(inputBuffer);
  } else {
    // PDF Document: rasterize page to 300 DPI image via PDF.js
    try {
      const baseImageBuffer = await renderPdfPageToImageBuffer(inputBuffer, pageNumber, dpi);
      baseImage = await loadImage(baseImageBuffer);
    } catch (err) {
      console.warn(`[SoM Tagger] PDF rasterization failed for page ${pageNumber}, using blank canvas:`, err);
      // Create a blank white placeholder canvas instead of trying to loadImage a PDF buffer
      const blankWidth = Math.round((8.5 * dpi) / 72 * 72) || 2480;
      const blankHeight = Math.round((11 * dpi) / 72 * 72) || 3508;
      const blankCanvas = createCanvas(blankWidth, blankHeight);
      const blankCtx = blankCanvas.getContext("2d");
      blankCtx.fillStyle = "#ffffff";
      blankCtx.fillRect(0, 0, blankWidth, blankHeight);
      baseImage = blankCanvas;
    }

    try {
      nativeBlocks = await extractNativePdfPage(inputBuffer, pageNumber);
    } catch (err) {
      console.warn(`[SoM Tagger] Draft primitives fallback for page ${pageNumber}:`, err);
    }
  }

  const width = baseImage.width;
  const height = baseImage.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw base document / photo image
  ctx.drawImage(baseImage, 0, 0, width, height);

  if (nativeBlocks.length === 0) {
    // Generate fine-grained grid visual regions if no native primitives
    nativeBlocks = [
      {
        id: `som_grid_1`,
        type: "paragraph",
        content: `Visual region for Page ${pageNumber}`,
        boundingBox: [50, 50, 950, 950],
        sourceMethod: "native",
        confidence: 0.9,
        pageNumber,
      },
    ];
  }

  const tags: SoMTagItem[] = [];
  const colorMap: Record<string, string> = {
    heading: "#06b6d4",
    paragraph: "#38bdf8",
    table: "#10b981",
    figure: "#a855f7",
    chart: "#a855f7",
    equation: "#f59e0b",
    code: "#f43f5e",
    list: "#ec4899",
  };

  const prefixMap: Record<string, string> = {
    heading: "H",
    paragraph: "P",
    table: "T",
    figure: "F",
    chart: "F",
    equation: "E",
    code: "C",
    list: "L",
  };

  const typeCounters: Record<string, number> = {};

  nativeBlocks.forEach((block) => {
    if (!block.boundingBox) return;

    const bType = block.type || "paragraph";
    typeCounters[bType] = (typeCounters[bType] || 0) + 1;

    const prefix = prefixMap[bType] || "B";
    const tagId = `[${prefix}-${String(typeCounters[bType]).padStart(2, "0")}]`;

    const [ymin, xmin, ymax, xmax] = block.boundingBox;

    // Convert 0-1000 normalized coords to pixel canvas coords
    const pxX = (xmin / 1000) * width;
    const pxY = (ymin / 1000) * height;
    const pxW = Math.max(30, ((xmax - xmin) / 1000) * width);
    const pxH = Math.max(20, ((ymax - ymin) / 1000) * height);

    const strokeColor = colorMap[bType] || "#38bdf8";

    // Stage 2: Draw Color-Coded Bounding Box Rectangle & Badge Tag
    ctx.lineWidth = Math.max(3, Math.round(width / 500));
    ctx.strokeStyle = strokeColor;
    ctx.strokeRect(pxX, pxY, pxW, pxH);

    // Draw badge tag label background
    const labelText = tagId;
    ctx.font = `bold ${Math.max(14, Math.round(width / 45))}px sans-serif`;
    const textMetrics = ctx.measureText(labelText);
    const labelW = textMetrics.width + 12;
    const labelH = Math.max(22, Math.round(width / 40));

    ctx.fillStyle = strokeColor;
    ctx.fillRect(pxX, Math.max(0, pxY - labelH), labelW, labelH);

    ctx.fillStyle = "#000000";
    ctx.fillText(labelText, pxX + 6, Math.max(labelH - 5, pxY - 5));

    const draftText = typeof block.content === "string" ? block.content : JSON.stringify(block.content);

    tags.push({
      tagId,
      type: bType,
      draftContent: draftText,
      boundingBox: [ymin, xmin, ymax, xmax],
    });
  });

  const somImageBuffer = canvas.toBuffer("image/png");
  const somDataUrl = `data:image/png;base64,${somImageBuffer.toString("base64")}`;

  // Generate Reference Map text for LLM Prompt
  const referenceMapLines: string[] = [];
  referenceMapLines.push(`--- SET-OF-MARKS (SoM) REFERENCE MAP (PAGE ${pageNumber}) ---`);
  tags.forEach((t) => {
    referenceMapLines.push(`${t.tagId} [${t.type.toUpperCase()}] Draft text: "${t.draftContent.replace(/\n/g, " ")}"`);
  });
  const referenceMapText = referenceMapLines.join("\n");

  return {
    pageNumber,
    somImageBuffer,
    somDataUrl,
    tags,
    referenceMapText,
  };
}
