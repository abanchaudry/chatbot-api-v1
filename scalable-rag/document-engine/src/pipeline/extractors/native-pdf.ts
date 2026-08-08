import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { ContentBlock, BlockType } from "../../types.js";

try {
  const localRequire = createRequire(import.meta.url);
  const workerPath = localRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} catch {}

interface TextItemInfo {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export async function extractNativePdfPage(
  pdfBuffer: Buffer,
  pageNumber: number // 1-based
): Promise<ContentBlock[]> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  const textContent = await page.getTextContent();
  const items: TextItemInfo[] = [];

  for (const item of textContent.items) {
    if ("str" in item && item.str.trim().length > 0) {
      const transform = item.transform;
      const tx = transform[4];
      const ty = pageHeight - transform[5];
      const fontSize = Math.abs(transform[0] || transform[3] || 12);
      const width = item.width || item.str.length * (fontSize * 0.5);
      const height = item.height || fontSize;

      items.push({
        text: item.str,
        x: tx,
        y: ty - height,
        width,
        height,
        fontSize,
      });
    }
  }

  if (items.length === 0) {
    return [];
  }

  const totalFontSize = items.reduce((sum, item) => sum + item.fontSize, 0);
  const avgFontSize = totalFontSize / items.length;

  items.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: TextItemInfo[][] = [];
  let currentLine: TextItemInfo[] = [];

  for (const item of items) {
    if (currentLine.length === 0) {
      currentLine.push(item);
    } else {
      const prevItem = currentLine[currentLine.length - 1];
      if (Math.abs(item.y - prevItem.y) < 4) {
        currentLine.push(item);
      } else {
        lines.push(currentLine);
        currentLine = [item];
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const blocks: ContentBlock[] = [];
  let blockLines: TextItemInfo[][] = [];

  const flushBlock = () => {
    if (blockLines.length === 0) return;

    const allLineTexts = blockLines.map((line) =>
      line.map((item) => item.text).join(" ")
    );
    const fullText = allLineTexts.join("\n");

    const flatItems = blockLines.flat();
    const minX = Math.min(...flatItems.map((i) => i.x));
    const maxX = Math.max(...flatItems.map((i) => i.x + i.width));
    const minY = Math.min(...flatItems.map((i) => i.y));
    const maxY = Math.max(...flatItems.map((i) => i.y + i.height));

    const maxBlockFontSize = Math.max(...flatItems.map((i) => i.fontSize));

    let type: BlockType = "paragraph";
    if (maxBlockFontSize >= avgFontSize * 1.3 && fullText.length < 150) {
      type = "heading";
    } else if (
      /^\s*[\-\*\•\d+[\.\)]]\s+/.test(fullText) ||
      blockLines.every((l) => /^\s*[\-\*\•\d+[\.\)]]/.test(l[0]?.text || ""))
    ) {
      type = "list";
    } else if (
      fullText.includes("|") ||
      blockLines.length >= 2 &&
        blockLines.filter((l) => l.length >= 2 || l[0]?.text.split(/\s{2,}/).length >= 2).length >= 2
    ) {
      type = "table";
    } else if (/^\s*(const|let|var|function|import|class|if|for|def|p,|h1|h2|blockquote|body)\b|\{|\}/i.test(fullText)) {
      type = "code";
    }

    const boundingBox: [number, number, number, number] = [
      Math.round(Math.max(0, Math.min(1000, (minY / pageHeight) * 1000))),
      Math.round(Math.max(0, Math.min(1000, (minX / pageWidth) * 1000))),
      Math.round(Math.max(0, Math.min(1000, (maxY / pageHeight) * 1000))),
      Math.round(Math.max(0, Math.min(1000, (maxX / pageWidth) * 1000))),
    ];

    blocks.push({
      id: `nat_${pageNumber}_${blocks.length}`,
      type,
      content: fullText,
      boundingBox,
      sourceMethod: "native",
      confidence: 0.95,
      pageNumber,
    });

    blockLines = [];
  };

  for (const line of lines) {
    if (blockLines.length === 0) {
      blockLines.push(line);
    } else {
      const prevLine = blockLines[blockLines.length - 1];
      const gap = line[0].y - (prevLine[0].y + prevLine[0].height);
      const isHeader = Math.max(...line.map((i) => i.fontSize)) >= avgFontSize * 1.3;
      const lineText = line.map((i) => i.text).join(" ");
      const prevText = prevLine.map((i) => i.text).join(" ");

      // Detect table rows (multi-column horizontal items)
      const isTableContinuation =
        (line.length >= 2 || lineText.split(/\s{2,}/).length >= 2) &&
        (prevLine.length >= 2 || prevText.split(/\s{2,}/).length >= 2) &&
        gap < 28;

      const isCodeSwitch =
        (/[\{\}\;\:]/.test(lineText) && !/[\{\}\;\:]/.test(prevText)) ||
        (!/[\{\}\;\:]/.test(lineText) && /[\{\}\;\:]/.test(prevText));

      if ((gap > 6 && !isTableContinuation) || isHeader || isCodeSwitch) {
        flushBlock();
        blockLines.push(line);
      } else {
        blockLines.push(line);
      }
    }
  }
  flushBlock();

  return blocks;
}
