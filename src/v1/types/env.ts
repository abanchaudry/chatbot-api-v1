// src/v5/types/env.ts
import type {
  D1Database,
  KVNamespace,
  R2Bucket,
  VectorizeIndex,
} from "@cloudflare/workers-types";

export type Env = {
  Bindings: {
    // -----------------------------
    // Core storage
    // -----------------------------
    DB: D1Database;
    CONFIG: KVNamespace;
    CACHE: KVNamespace;

    // -----------------------------
    // Vector
    // -----------------------------
    VECTORIZE: VectorizeIndex;

    // -----------------------------
    // R2 Storage
    // -----------------------------
    apogee_public: R2Bucket;
    apogee_private: R2Bucket;

    // -----------------------------
    // OpenAI
    // -----------------------------
    OPENAI_API_KEY: string;
    OPENAI_CHAT_MODEL?: string;   // e.g. gpt-4o-mini
    OPENAI_RERANK_MODEL?: string; // e.g. gpt-4o-mini
    OPENAI_GATE_MODEL?: string;   // e.g. gpt-4o-mini

    // -----------------------------
    // Assistant config
    // -----------------------------
    ASSISTANT_NAME?: string;
    ASSISTANT_DOMAIN_HINT?: string;
    FALLBACK_MESSAGE?: string;
    APP_VERSION?: string;

    // -----------------------------
    // Feature flags
    // -----------------------------
    ENABLE_WEB_SEARCH?: string; // "true"/"false"
    ENABLE_PDF_SEARCH?: string; // "true"/"false"

    // -----------------------------
    // Retrieval tuning (0..100)
    // -----------------------------
    MIN_VECTOR_SCORE?: string; // e.g. "40"
    MIN_WEB_SCORE?: string;    // e.g. "40"
    DELTA_VECTOR?: string;     // e.g. "12"
    DELTA_WEB?: string;        // e.g. "12"
    ALLOW_DOMAINS?: string;    // comma-separated hostnames; empty = allow all

    // -----------------------------
    // Admin / CORS
    // -----------------------------
    ADMIN_API_KEY?: string;
    JWT_SECRET: string;
    ALLOWED_ORIGINS?: string;
    ADMIN_LOGS?: string;
    DEBUG_TRACE?: string;

    // -----------------------------
    // Cloudflare AI Search
    // -----------------------------
    CF_ACCOUNT_ID: string;

    // Preferred token name used by our aiSearch service
    CF_AI_SEARCH_TOKEN?: string;

    // Backward compat tokens (if any old code still reads them)
    CF_SEARCH_AI_API_TOKEN?: string;
    CF_API_TOKEN?: string;

    // AI Search instance ids
    CF_AI_SEARCH_WEB_ID?: string;
    CF_AI_SEARCH_PDFS_ID?: string;

    ENABLE_RERANK_LLM?: string;
    ENABLE_GATE_LLM?: string;
    DELTA_VEC?: string;
    HYBRID_LEXICAL?: string;
    RRF_K?: string;
    AI?: Ai;
  };
};
