import {
  StructuredDocument,
  DocumentType,
  PageBlock,
  OutlineItem,
  SectionItem,
  ParagraphItem,
  TableItem,
  FigureItem,
  ChartItem,
  CodeBlockItem,
  EquationItem,
  ValidationReport,
  ProcessingStats,
  EngineMode,
} from "../types.js";
import { DoclingParseResult } from "./docling-parser.js";
import { OCRPageResult } from "./openai-ocr.js";

export interface AssemblyInput {
  documentId: string;
  documentType: DocumentType;
  engineMode: EngineMode;
  filename: string;
  fileSizeBytes: number;
  doclingResult: DoclingParseResult;
  ocrResults: OCRPageResult[];
  mergedPages: PageBlock[];
  validationReport: ValidationReport;
  ocrStartTimeMs?: number;
  ocrEndTimeMs?: number;
  totalStartTimeMs: number;
}

export function assembleStructuredDocument(input: AssemblyInput): StructuredDocument {
  const {
    documentId,
    documentType,
    engineMode,
    filename,
    fileSizeBytes,
    doclingResult,
    ocrResults,
    mergedPages,
    validationReport,
    ocrStartTimeMs,
    ocrEndTimeMs,
    totalStartTimeMs,
  } = input;

  const totalProcessingTimeMs = Date.now() - totalStartTimeMs;
  const ocrTimeMs = ocrStartTimeMs && ocrEndTimeMs ? ocrEndTimeMs - ocrStartTimeMs : 0;

  const paragraphs: ParagraphItem[] = [...doclingResult.paragraphs];
  const tables: TableItem[] = [...doclingResult.tables];
  const figures: FigureItem[] = [...doclingResult.figures];
  const charts: ChartItem[] = [];
  const codeBlocks: CodeBlockItem[] = [...doclingResult.codeBlocks];
  const equations: EquationItem[] = [...doclingResult.equations];

  // Aggregate OCR extracted items
  ocrResults.forEach((ocrRes) => {
    ocrRes.blocks.forEach((block) => {
      const textContent = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
      if (block.type === "table") {
        tables.push({
          id: block.id,
          markdown: textContent,
          rows: [],
          pageNumber: block.pageNumber,
          source: "ocr",
        });
      } else if (block.type === "figure") {
        figures.push({
          id: block.id,
          description: textContent,
          pageNumber: block.pageNumber,
          source: "ocr",
        });
      } else if (block.type === "chart") {
        charts.push({
          id: block.id,
          title: "Extracted Chart",
          dataSummary: textContent,
          pageNumber: block.pageNumber,
          source: "ocr",
        });
      } else if (block.type === "code") {
        codeBlocks.push({
          id: block.id,
          code: textContent,
          pageNumber: block.pageNumber,
        });
      } else if (block.type === "paragraph" && textContent.length > 0) {
        paragraphs.push({
          id: block.id,
          text: textContent,
          pageNumber: block.pageNumber,
        });
      }
    });
  });

  const processingStats: ProcessingStats = {
    engineMode,
    doclingSuccess: doclingResult.success,
    doclingTimeMs: doclingResult.processingTimeMs,
    ocrPagesProcessed: ocrResults.length,
    ocrTimeMs,
    totalProcessingTimeMs,
  };

  const warnings: string[] = [...validationReport.ruleIssues];

  return {
    documentId,
    documentType,
    metadata: {
      originalFilename: filename,
      pageCount: mergedPages.length,
      fileSizeBytes,
      processedAt: new Date().toISOString(),
    },
    documentOutline: doclingResult.outline,
    sections: doclingResult.sections,
    paragraphs,
    tables,
    figures,
    charts,
    codeBlocks,
    equations,
    pages: mergedPages,
    warnings,
    validationReport,
    processingStats,
  };
}
