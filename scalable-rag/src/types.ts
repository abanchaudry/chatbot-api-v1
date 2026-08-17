import type { Ai, Fetcher } from "@cloudflare/workers-types";

// ─── Cloudflare Env Bindings ────────────────────────────────────────

export interface Env {
  DB: D1Database;
  DOCUMENTS?: R2Bucket;
  INGESTION_QUEUE: Queue;
  AI: Ai;
  ASSETS: Fetcher;
  VECTORIZE: VectorizeIndex;
  OPENAI_API_KEY: string;
}

// ─── Domain Types ───────────────────────────────────────────────────

export type DocumentType =
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "image"
  | "text"
  | "unknown";

export type JobStatus = "queued" | "processing" | "done" | "failed";
export type EngineMode = "offline" | "hybrid" | "ai-full" | "ai";

// ─── Database Records ───────────────────────────────────────────────

export interface DocumentRecord {
  id: string;
  filename: string;
  file_type: DocumentType;
  file_size: number;
  r2_key: string;
  status: JobStatus;
  engine_mode: EngineMode;
  page_count: number | null;
  extracted_r2_key: string | null;
  error_message: string | null;
  classification_category: string | null;
  classification_confidence: number | null;
  classification_reasoning: string | null;
  suggested_category: string | null;
  suggested_chunking_rule: string | null;
  is_chunked: number;
  is_indexed: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  tier: "large" | "medium" | "small";
  chunk_index: number;
  parent_id: string | null;
  content: string;
  token_count: number;
  category: string;
  created_at: string;
}

export interface JobRecord {
  id: string;
  document_id: string;
  status: JobStatus;
  engine_mode: EngineMode;
  started_at: string | null;
  completed_at: string | null;
  processing_time_ms: number | null;
  error: string | null;
  created_at: string;
}

// ─── Extraction ─────────────────────────────────────────────────────

export interface ExtractionResult {
  documentId: string;
  filename: string;
  fileType: DocumentType;
  engineMode: EngineMode;
  markdown: string;
  pageCount: number;
  processingTimeMs: number;
  warnings: string[];
}

export interface QueueMessage {
  jobId: string;
  documentId: string;
  filename: string;
  fileType: DocumentType;
  engineMode: EngineMode;
  r2Key: string;
}
