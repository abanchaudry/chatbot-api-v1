import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { PageTriageResult, PageTriageCategory } from "../types.js";

try {
  const localRequire = createRequire(import.meta.url);
  const workerPath = localRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} catch {}

export async function triagePdfPage(
  pdfBuffer: Buffer,
  pageNumber: number // 1-based
): Promise<PageTriageResult> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.0 });

  const pageArea = viewport.width * viewport.height;

  const textContent = await page.getTextContent();
  let fullText = "";
  for (const item of textContent.items) {
    if ("str" in item) {
      fullText += item.str + " ";
    }
  }

  const charCount = fullText.replace(/\s+/g, "").length;

  let garbledCount = 0;
  const totalChars = fullText.length;
  for (let i = 0; i < totalChars; i++) {
    const code = fullText.charCodeAt(i);
    if (
      code === 65533 ||
      (code < 32 && code !== 10 && code !== 13 && code !== 9) ||
      (code >= 127 && code < 160)
    ) {
      garbledCount++;
    }
  }
  const garbledRatio = totalChars > 0 ? garbledCount / totalChars : 0;

  let imageAreaRatio = 0;
  const visualRegions: [number, number, number, number][] = [];

  try {
    const operatorList = await page.getOperatorList();
    const OPS = (pdfjs as any).OPS || {};
    if (operatorList && operatorList.fnArray) {
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        const fn = operatorList.fnArray[i];
        if (
          fn === OPS.paintImageXObject ||
          fn === OPS.paintInlineImageXObject ||
          fn === OPS.paintImageMaskXObject
        ) {
          imageAreaRatio += 0.2;
        }
      }
    }
  } catch (err) {
    // Fallback if operator list inspection fails
  }

  imageAreaRatio = Math.min(1.0, imageAreaRatio);

  let category: PageTriageCategory = "text-native";

  if (charCount < 30 || (garbledRatio > 0.35 && charCount < 150)) {
    category = "image-only";
  } else if (imageAreaRatio >= 0.15 || hasTableOrChartKeywords(fullText)) {
    category = "hybrid";
  } else {
    category = "text-native";
  }

  return {
    pageNumber,
    category,
    charCount,
    garbledRatio,
    imageAreaRatio,
    pageArea,
    visualRegions,
  };
}

function hasTableOrChartKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  const tableMarkers = ["table ", "figure ", "chart ", "graph ", "fig."];
  return tableMarkers.some((marker) => lower.includes(marker));
}
