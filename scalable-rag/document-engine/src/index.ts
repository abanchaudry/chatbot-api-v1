import * as crypto from "crypto";
import * as path from "path";
import { detectAndValidateFile } from "./modules/file-detector.js";
import { parseWithDocling } from "./modules/docling-parser.js";
import { createSetOfMarksTaggedPage } from "./modules/som-tagger.js";
import { processSoMVisionPage } from "./modules/som-vision.js";
import { spatialDAGTopologicalSortPages } from "./modules/dag-sorter.js";
import { extractVisualContentPages } from "./modules/image-extractor.js";
import { performOfflineOCR } from "./modules/offline-ocr.js";
import { OCRPageResult } from "./modules/openai-ocr.js";
import { mergeDoclingAndOCR } from "./modules/merger.js";
import { performRuleValidation } from "./modules/validation.js";
import { assembleStructuredDocument } from "./modules/structured-document.js";
import { exportToMarkdown, exportToValidationReport } from "./modules/exporters.js";
import { getPdfPageCount } from "./utils/rasterize.js";
import { logHeader, logStep, logSuccess, logWarn } from "./utils/logger.js";
import {
  StructuredDocument,
  ProcessOptions,
  PageBlock,
  EngineMode,
} from "./types.js";

export * from "./types.js";
export { exportToMarkdown, exportToValidationReport };

/**
 * Public API Surface for Document Intelligence Engine.
 * Supports 2 Execution Pipelines:
 * - Option 1: Pure Offline Engine (engineMode = "offline") -> 100% local, Tesseract OCR, zero LLM calls.
 * - Option 2: Full AI Engine (engineMode = "ai")      -> Hybrid 5-Stage Set-of-Marks (SoM) + Spatial DAG Multimodal Engine.
 */
export async function processDocument(
  input: string | Buffer,
  options?: ProcessOptions
): Promise<StructuredDocument> {
  const totalStartTimeMs = Date.now();
  const engineMode: EngineMode = options?.engineMode || "offline";

  let buffer: Buffer;
  let filename = options?.originalFilename || "document";

  if (typeof input === "string") {
    const fs = await import("fs");
    buffer = fs.readFileSync(input);
    filename = path.basename(input);
  } else {
    buffer = input;
  }

  logHeader(`STARTING DOCUMENT INTELLIGENCE PIPELINE [${engineMode.toUpperCase()}]`);

  // 1. Validate File & Detect File Type
  const fileVal = detectAndValidateFile(buffer, filename);
  if (!fileVal.valid) {
    throw new Error(`File Validation Error: ${fileVal.error}`);
  }

  // Ensure filename has proper extension matching detected document type
  if (!path.extname(filename) && fileVal.documentType !== "unknown") {
    filename = `${filename}.${fileVal.documentType}`;
  }

  logStep("FILE VALIDATION", `Validated file '${filename}'`, {
    sizeBytes: fileVal.fileSizeBytes,
    sizeMB: (fileVal.fileSizeBytes / 1024 / 1024).toFixed(2) + " MB",
    detectedType: fileVal.documentType,
    engineMode,
  });

  const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
  const documentId = `doc_${Date.now()}_${hash}`;

  let expectedPageCount = 1;
  if (fileVal.documentType === "pdf") {
    try {
      expectedPageCount = await getPdfPageCount(buffer);
    } catch {}
  }
  logStep("PAGE COUNT", `Detected ${expectedPageCount} total pages for processing`);

  let doclingResult = await parseWithDocling(buffer, filename);
  let ocrResults: OCRPageResult[] = [];
  let mergedPages: PageBlock[] = [];
  let ocrStartTimeMs: number | undefined;
  let ocrEndTimeMs: number | undefined;

  const isVisualFormat = fileVal.documentType === "pdf" || fileVal.documentType === "image";

  if (engineMode === "offline" || !isVisualFormat) {
    // =========================================================================
    // OPTION 1: PURE OFFLINE ENGINE / NATIVE OFFICE EXTRACTION
    // =========================================================================
    logStep("ENGINE DISPATCH", `Executing Native Structural Extraction for ${fileVal.documentType.toUpperCase()}`);

    if (doclingResult.missingVisualPageNumbers.length > 0 || fileVal.documentType === "image") {
      const targetPages = fileVal.documentType === "image" ? [1] : doclingResult.missingVisualPageNumbers;
      logStep("OCR ROUTE", `Targeting ${targetPages.length} pages for Local Tesseract.js OCR: [${targetPages.join(", ")}]`);
      ocrStartTimeMs = Date.now();

      const imagesToOCR = await extractVisualContentPages(
        buffer,
        fileVal.documentType,
        targetPages,
        options?.maxDpi || 200
      );

      ocrResults = await performOfflineOCR(imagesToOCR);
      ocrEndTimeMs = Date.now();
      logSuccess("OFFLINE OCR", `Completed Tesseract OCR across ${ocrResults.length} pages in ${ocrEndTimeMs - ocrStartTimeMs} ms`);
    }
    mergedPages = mergeDoclingAndOCR(doclingResult, ocrResults);
  } else {
    // =========================================================================
    // OPTION 2: HYBRID 5-STAGE SET-OF-MARKS (SoM) + SPATIAL DAG MULTIMODAL ENGINE
    // =========================================================================
    logStep("ENGINE DISPATCH", "Executing Option 2: 5-Stage SoM + Spatial DAG Multimodal AI Pipeline");

    const pageBlocksList: PageBlock[] = [];
    ocrStartTimeMs = Date.now();

    for (let pNum = 1; pNum <= Math.max(1, expectedPageCount); pNum++) {
      // Stage 1 & Stage 2: 300 DPI Rasterization + Set-of-Marks Canvas Badge Tagging
      logStep("STAGE 1 & 2 (SoM TAGGER)", `Rasterizing Page ${pNum}/${expectedPageCount} to 300 DPI & drawing SoM visual badges...`);
      const somTaggedPage = await createSetOfMarksTaggedPage(buffer, pNum, options?.maxDpi || 300);
      logStep("SoM BADGES", `Overlaid ${somTaggedPage.tags.length} fine-grained visual badges on Page ${pNum}`);

      // Stage 3: Multimodal Vision Processing via OpenAI Structured Outputs (PageDOM)
      logStep("STAGE 3 (MULTIMODAL VISION)", `Submitting SoM Image & Reference Map to OpenAI ${options?.model || "gpt-4o"}...`);
      const visionResult = await processSoMVisionPage(somTaggedPage, options);
      logSuccess("VISION EXTRACT", `Extracted ${visionResult.blocks.length} structured PageDOM blocks for Page ${pNum}`);

      pageBlocksList.push({
        pageNumber: pNum,
        blocks: visionResult.blocks,
      });

      ocrResults.push({
        pageNumber: pNum,
        blocks: visionResult.blocks,
        rawText: visionResult.blocks.map((b) => String(b.content)).join("\n\n"),
      });
    }

    ocrEndTimeMs = Date.now();

    // Stage 4: Spatial DAG Topological Sorting (Reading order perfection for 2-column papers/slides)
    logStep("STAGE 4 (SPATIAL DAG SORT)", `Constructing Spatial DAG and running Kahn's Topological Sorting algorithm...`);
    mergedPages = spatialDAGTopologicalSortPages(pageBlocksList);
    logSuccess("DAG SORT", `Topological sort completed across ${mergedPages.length} pages`);
  }

  // Rule-Based Validation
  logStep("VALIDATION", "Running mandatory document integrity rule checks...");
  let validationReport = performRuleValidation(mergedPages, expectedPageCount, false);

  if (!validationReport.passed && (options?.maxRetries ?? 1) > 0) {
    logWarn("VALIDATION", "Initial rule validation failed. Executing fallback retry pass...");
    doclingResult = await parseWithDocling(buffer, filename);
    mergedPages = mergeDoclingAndOCR(doclingResult, ocrResults);
    validationReport = performRuleValidation(mergedPages, expectedPageCount, true);
  }

  const totalTimeMs = Date.now() - totalStartTimeMs;

  // Stage 5: Unified StructuredDocument Assembly
  const doc = assembleStructuredDocument({
    documentId,
    documentType: fileVal.documentType,
    engineMode,
    filename,
    fileSizeBytes: fileVal.fileSizeBytes,
    doclingResult,
    ocrResults,
    mergedPages,
    validationReport,
    ocrStartTimeMs,
    ocrEndTimeMs,
    totalStartTimeMs,
  });

  logSuccess("PIPELINE COMPLETE", `Successfully processed '${filename}' in ${totalTimeMs} ms`, {
    documentId,
    type: fileVal.documentType,
    pages: doc.pages.length,
    tables: doc.tables.length,
    codeBlocks: doc.codeBlocks.length,
    totalBlocks: doc.pages.reduce((acc, p) => acc + p.blocks.length, 0),
    validationPassed: validationReport.passed,
  });

  return doc;
}
