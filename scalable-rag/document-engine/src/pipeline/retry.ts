import { ContentBlock, PageBlock, ProcessOptions, PageTriageResult } from "../types.js";
import { extractVisionPdfPage } from "./extractors/vision-pdf.js";
import { extractNativePdfPage } from "./extractors/native-pdf.js";
import { mergePageBlocks } from "./merge.js";

/**
 * Scoped retry logic for failing or low-confidence pages.
 * Never re-runs the entire document; only retries the failing page.
 */
export async function retryPageExtraction(
  pdfBuffer: Buffer,
  pageNum: number,
  triage: PageTriageResult,
  options?: ProcessOptions,
  attempt: number = 1
): Promise<ContentBlock[]> {
  const maxRetries = options?.maxRetries ?? 2;
  if (attempt > maxRetries) {
    throw new Error(`Max retries (${maxRetries}) exceeded for page ${pageNum}`);
  }

  // Escalated options on retry: higher DPI (300 DPI) and vision fallback
  const escalatedOptions: ProcessOptions = {
    ...options,
    maxDpi: 300, // Escalate resolution on retry
  };

  try {
    let nativeBlocks: ContentBlock[] = [];
    let visionBlocks: ContentBlock[] | undefined = undefined;

    // Retry using elevated vision extraction or re-parsing
    visionBlocks = await extractVisionPdfPage(pdfBuffer, pageNum, escalatedOptions);
    nativeBlocks = await extractNativePdfPage(pdfBuffer, pageNum);

    const merged = mergePageBlocks(triage, nativeBlocks, visionBlocks);
    return merged;
  } catch (err) {
    if (attempt < maxRetries) {
      return retryPageExtraction(pdfBuffer, pageNum, triage, options, attempt + 1);
    }
    throw err;
  }
}
