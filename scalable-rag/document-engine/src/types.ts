export type DocumentType =
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "image"
  | "code"
  | "unknown";

export type BlockType =
  | "paragraph"
  | "heading"
  | "table"
  | "figure"
  | "chart"
  | "equation"
  | "code"
  | "list";

export type SourceMethod = "docling" | "ocr" | "native";

export type EngineMode = "offline" | "ai";

export type PageTriageCategory = "text-native" | "image-only" | "hybrid";

export interface PageTriageResult {
  pageNumber: number;
  category: PageTriageCategory;
  charCount: number;
  garbledRatio: number;
  imageAreaRatio: number;
  pageArea: number;
  visualRegions?: [number, number, number, number][];
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string | Record<string, unknown>;
  boundingBox?: [number, number, number, number];
  sourceMethod: SourceMethod;
  confidence: number;
  pageNumber: number;
}

export interface PageBlock {
  pageNumber: number;
  blocks: ContentBlock[];
}

export interface OutlineItem {
  title: string;
  level: number;
  pageNumber: number;
}

export interface SectionItem {
  id: string;
  heading?: string;
  level?: number;
  contentBlockIds: string[];
}

export interface ParagraphItem {
  id: string;
  text: string;
  pageNumber: number;
}

export interface TableItem {
  id: string;
  markdown: string;
  rows: string[][];
  pageNumber: number;
  source: SourceMethod;
}

export interface FigureItem {
  id: string;
  caption?: string;
  description?: string;
  pageNumber: number;
  source: SourceMethod;
}

export interface ChartItem {
  id: string;
  title?: string;
  dataSummary?: string;
  pageNumber: number;
  source: SourceMethod;
}

export interface CodeBlockItem {
  id: string;
  language?: string;
  code: string;
  pageNumber: number;
}

export interface EquationItem {
  id: string;
  latex: string;
  pageNumber: number;
}

export interface ValidationReport {
  passed: boolean;
  ruleValidationRan: boolean;
  ruleIssues: string[];
  retryAttempted: boolean;
  aiValidationRan: boolean;
  aiConfidenceScore?: number;
  aiWarnings?: string[];
  aiSuggestedCorrections?: string[];
}

export interface ProcessingStats {
  engineMode: EngineMode;
  doclingSuccess: boolean;
  doclingTimeMs: number;
  ocrPagesProcessed: number;
  ocrTimeMs: number;
  totalProcessingTimeMs: number;
  tokensUsed?: number;
}

export interface StructuredDocument {
  documentId: string;
  documentType: DocumentType;
  metadata: {
    originalFilename: string;
    pageCount: number;
    fileSizeBytes: number;
    processedAt: string;
  };
  documentOutline: OutlineItem[];
  sections: SectionItem[];
  paragraphs: ParagraphItem[];
  tables: TableItem[];
  figures: FigureItem[];
  charts: ChartItem[];
  codeBlocks: CodeBlockItem[];
  equations: EquationItem[];
  pages: PageBlock[];
  warnings: string[];
  validationReport: ValidationReport;
  processingStats: ProcessingStats;
}

export interface ProcessOptions {
  engineMode?: EngineMode;
  originalFilename?: string;
  apiKey?: string;
  model?: string;
  maxDpi?: number;
  validationMode?: "none" | "rule" | "ai";
  enableLLMValidation?: boolean;
  maxRetries?: number;
  enableCache?: boolean;
}
