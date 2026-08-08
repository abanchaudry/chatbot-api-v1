import { DoclingParseResult } from "./docling-parser.js";
import { OCRPageResult } from "./openai-ocr.js";
import { PageBlock, ContentBlock } from "../types.js";

export function mergeDoclingAndOCR(
  docling: DoclingParseResult,
  ocrResults: OCRPageResult[]
): PageBlock[] {
  const ocrMap = new Map<number, ContentBlock[]>();
  ocrResults.forEach((res) => {
    ocrMap.set(res.pageNumber, res.blocks);
  });

  const mergedPages: PageBlock[] = [];

  docling.pages.forEach((page) => {
    const pNum = page.pageNumber;
    const ocrBlocks = ocrMap.get(pNum);

    if (!ocrBlocks || ocrBlocks.length === 0) {
      mergedPages.push(page);
    } else if (page.blocks.length === 0) {
      // Image-only page: use OCR blocks wholesale
      mergedPages.push({
        pageNumber: pNum,
        blocks: sortBlocksByPosition(ocrBlocks),
      });
    } else {
      // Hybrid page: splice Docling blocks with OCR blocks, suppressing duplicates
      const nonOverlappingOcr = ocrBlocks.filter((ocrBlock) => {
        if (!ocrBlock.boundingBox) return true;
        for (const docBlock of page.blocks) {
          if (!docBlock.boundingBox) continue;
          if (calculateOverlapRatio(ocrBlock.boundingBox, docBlock.boundingBox) > 0.35) {
            return false; // Suppress duplicate OCR block
          }
        }
        return true;
      });

      const combined = [...page.blocks, ...nonOverlappingOcr];
      mergedPages.push({
        pageNumber: pNum,
        blocks: sortBlocksByPosition(combined),
      });
    }
  });

  return mergedPages;
}

function sortBlocksByPosition(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => {
    const yA = a.boundingBox ? a.boundingBox[0] : 0;
    const yB = b.boundingBox ? b.boundingBox[0] : 0;
    if (Math.abs(yA - yB) < 15) {
      const xA = a.boundingBox ? a.boundingBox[1] : 0;
      const xB = b.boundingBox ? b.boundingBox[1] : 0;
      return xA - xB;
    }
    return yA - yB;
  });
}

function calculateOverlapRatio(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const [yminA, xminA, ymaxA, xmaxA] = boxA;
  const [yminB, xminB, ymaxB, xmaxB] = boxB;

  const interYmin = Math.max(yminA, yminB);
  const interXmin = Math.max(xminA, xminB);
  const interYmax = Math.min(ymaxA, ymaxB);
  const interXmax = Math.min(xmaxA, xmaxB);

  if (interYmax <= interYmin || interXmax <= interXmin) {
    return 0;
  }

  const interArea = (interYmax - interYmin) * (interXmax - interXmin);
  const areaA = Math.max(1, (ymaxA - yminA) * (xmaxA - xminA));
  return interArea / areaA;
}
