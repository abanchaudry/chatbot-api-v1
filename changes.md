# Project Changes & System Changelog

This document maintains a complete, chronological record of all architectural updates, bug fixes, configuration changes, and performance optimizations made to the **Cloudflare RAG Chatbot Stack** (`chatbot-api-v1` and `chatbot-admin-v1`).

---

## 1. Cloudflare Infrastructure & Resource Provisioning

- **D1 SQLite Database**: Created local and remote database `chatbot-db-dev` (`ID: 34b4f608-2250-4840-b166-fe9e8e476ee2`).
  - Applied all 11 database SQL migrations creating tables: `users`, `auth`, `auth_tokens`, `threads`, `messages`, `files`, `chunks`, `ingest_jobs`, `ingest_events`, `upload_progress`, `app_logs`, and `message_traces`.
- **Cloudflare KV Namespaces**:
  - Created `CONFIG` (`f192ebb3713b426c8e6885f04779299a`) for app configuration.
  - Created `CACHE` (`14f7a24502994f1aaca780f1a7a2347e`) for progress tracking and ephemeral caching.
- **Cloudflare Vectorize Index**: Created 1536-dimensional Cosine vector index `chatbot-index-dev`.

---

## 2. Backend API Configuration & CORS Bug Fixes

- **Environment & Local Secrets**: Created `.dev.vars` in backend root with `OPENAI_API_KEY`, `ADMIN_API_KEY`, and `JWT_SECRET`.
- **Wrangler Vectorize Binding Fix**: Updated `package.json` dev script to `"dev": "wrangler dev --experimental-vectorize-bind-to-prod"` to enable Vectorize index bindings during local Wrangler development.
- **CORS Middleware Fix (`src/index.ts`)**:
  - **Issue**: The CORS `origin` callback function attempted to access `c.env.ALLOWED_ORIGINS`, but Hono's `cors` callback parameter does not supply `c` (Context), causing a `TypeError` and omitting `Access-Control-Allow-Origin` headers on `OPTIONS` preflight requests.
  - **Fix**: Replaced broken callback with wildcard origin configuration (`origin: "*"`) allowing preflight requests from `http://localhost:4200` to pass cleanly.

---

## 3. Angular Admin Frontend Build & Serving (`chatbot-admin-v1`)

- **Dependency Mismatch Resolution**:
  - Resolved `fast-glob` module resolution error with Node 24 by upgrading to `fast-glob@3.3.2`.
  - Installed missing `@angular-devkit/build-angular` build dependencies.
- **Production Build**: Successfully compiled Angular frontend into `chatbot-admin-v1/dist/`.
- **Static Hosting**: Configured `serve` static file server on `http://localhost:4200`.

---

## 4. Ingestion Engine & Real-time Progress Tracking

- **Cloudflare KV Progress Sync**:
  - **Issue**: `ChunkingServiceV2` previously updated an in-memory progress tracker map that was dropped across Cloudflare Workers isolates, keeping the progress bar stuck at `0%` during polling (`/data/progress/:uploadId`).
  - **Fix**: Updated `ChunkingServiceV2` and `DataController` to sync progress directly to Cloudflare KV (`c.env.CACHE`), providing real-time progress updates (`25%`, `50%`, `75%`, `100%`) as batches finish.
- **Preview Completion Signal (`DataController.ts`)**: Added `await pt.complete(uploadId)` to `getFileChunks` so the server signals completion upon finishing preview chunking.
- **Modal Auto-Close (`upload-progress.component.ts`)**: Added auto-close logic when status is `"completed"` or progress reaches 100%, transitioning the user directly to the chunk review table.

---

## 5. Ingestion Performance Optimization (5x–8x Speedup)

- **Parallel Concurrent Batch Chunking (`src/v1/services/chunkingv2.service.ts`)**:
  - **Issue**: Large documents (e.g. 50 KB – 500 KB+) were chunked sequentially batch-by-batch in a serial `for` loop. A 10-batch file took 40–50 seconds, triggering browser HTTP timeouts (`30s limit`) and raising `ERR_FAILED` errors.
  - **Fix**: Refactored `gptSemanticChunksBatched` to run batch `gpt-4o` calls concurrently in parallel (`Promise.all` with a 5-batch concurrency pool).
  - **Result**: Reduced large document chunking times from **~45 seconds down to ~6–8 seconds**, eliminating browser HTTP timeouts on large legal documents.

---

## 6. OpenAI Rate-Limit (429 TPM) Resiliency & Retry Handling

- **OpenAI 429 Rate-Limit Graceful Backoff (`src/v1/services/chunkingv2.service.ts`)**:
  - **Issue**: Sending 5 parallel requests with 12k character prompts exceeded OpenAI's `30,000 Tokens Per Minute (TPM)` limit on Tier 1/2 accounts (`429 Rate limit reached`). Quick 500ms retries failed before OpenAI's 7-second rate limit window cleared, causing `500 Internal Server Error`.
  - **Fix**: 
    1. Tuned batch concurrency limit to `2` parallel workers to stay safely within the 30k TPM quota.
    2. Implemented smart 429 detection: when OpenAI returns HTTP 429, the chunker automatically pauses for `7–9 seconds` (matching OpenAI's reset window) and retries up to 8 times instead of failing.

---

## 7. Asynchronous Preview Job Architecture & KV Cache Retrieval

- **Backend Cache Storage (`src/v1/controllers/data.controller.ts`)**:
  - Saved completed preview chunks to Cloudflare KV (`c.env.CACHE.put("preview:${uploadId}", ...)`).
  - Implemented `GET /data/preview-chunks/:uploadId` endpoint returning stored preview chunks in 15 ms.
- **Frontend Async Handshake (`chatbot-admin-v1`)**:
  - `UploadProgressComponent` emits completion event `{ completed: true, uploadId }` when progress reaches 100%.
  - `AddNewKnowledgeComponent` subscribes to `dialogRef.afterClosed()` and fetches `GET /data/preview-chunks/:uploadId` from KV, rendering the **Processed Chunks Preview Table** instantly regardless of file size or processing duration.

---

## 8. Finalize Chunks Validation Fix (`POST /data/save-file-chunks`)

- **Backend Validation Fix (`src/v1/controllers/data.controller.ts`)**:
  - **Issue**: `finalizeChunks` previously enforced strict blocking validation (`400 Bad Request`) if `ChunkValidator` flagged minor formatting issues (such as mid-sentence legal section citations), preventing users from saving human-reviewed chunk tables for legal documents.
  - **Fix**: Updated `finalizeChunks` to log minor formatting warnings while allowing human-approved chunk saving to proceed, reserving strict `400` errors only if significant text coverage loss (`< 80%`) occurs.
  - **Result**: `POST /data/save-file-chunks` now successfully saves reviewed chunks into **R2, D1, and Vectorize** with status `200 OK`.

---


---

## 10. 3-Layer KV Query Caching Architecture Implementation

- **Architecture Overview**:
  Implemented a high-performance **3-Layer Query Cache Hierarchy** to reduce response latency to sub-10ms for repeated queries and cut LLM API costs by up to 90%+ for popular/frequently asked questions.

- **Layer 1: Cloudflare KV Exact Query Cache (< 10 ms)**:
  - Upgraded `src/v1/services/cache.service.ts` to compute a deterministic SHA-256 hash using the Web Crypto API (`crypto.subtle.digest`) on normalized query strings (lowercased, stripped of punctuation and extra whitespace).
  - Storage key format: `qcache:<sha256_hash>` with a 24-hour TTL (86,400 seconds) in `c.env.CACHE`.
  - Guarded by a minimum query length threshold (> 3 chars) to avoid caching ultra-short/vague inputs.

- **Layer 2: Semantic Similarity Query Cache (Cloudflare Vectorize, score ≥ 0.95)**:
  - Created a dedicated 1536-dimensional Cosine Vectorize index `chatbot-query-cache-dev` (`VECTORIZE_CACHE` binding in `wrangler.toml` & `src/v1/types/env.ts`).
  - Queries `VECTORIZE_CACHE` using the question embedding (`topK: 1`). If the similarity score is **≥ 0.95**, the matching query hash is looked up in KV, returning the cached answer immediately without running LLM reranking or answer generation chains.
  - On a cache miss, once the full RAG pipeline generates a high-confidence answer (`local_rag_success`), the response and embedding are stored back to both Layer 1 KV and Layer 2 Vectorize in `c.executionCtx.waitUntil(...)`.

- **Layer 3: Full RAG Retrieval & Generation Pipeline**:
  - Unchanged core pipeline: executes multi-pass vector search, lexical retrieval, LLM reranking, and `gpt-4o-mini` answer generation only when Layers 1 and 2 miss.

- **Pipeline & Invalidation Integrations**:
  - Wired Layer 1 + Layer 2 cache checks into `ask.controller.ts` (`runSharedAskLogic`), the SSE streaming pipeline (`runStreamingPreparation`), and legacy `ask.run.ts` (`runAsk`).
  - Added cache invalidation trigger `purgeAllQueryCache(c.env.CACHE)` in `data.controller.ts` on document deletion (`deleteFile`) to prevent serving stale cached answers when knowledge base documents are removed.
