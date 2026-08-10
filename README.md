# 🤖 Chatbot API — Enterprise RAG Platform & Edge AI (v1)

A production-grade, multi-tenant **Retrieval-Augmented Generation (RAG)** platform and administration portal built on **Cloudflare Workers**, **SQLite FTS5**, **Cloudflare Vectorize**, **KV Cache**, and **Angular 19**.

The system features **Dual Hybrid Search (Vector + FTS5 BM25)**, **Reciprocal Rank Fusion (RRF)**, **Dynamic Business Persona Customization**, a **3-Layer Speed & Semantic Caching Engine**, and a **Multi-Format Extraction Microservice** (PDF, DOCX, Vision OCR, 3-Tier Chunking).

---

## 🌟 Key Platform Features

### 🔍 1. Dual Hybrid Search & RRF Reranking
- **Vector Search (Cloudflare Vectorize)**: 1536-dimensional OpenAI embeddings (`text-embedding-3-small`) with cosine distance matching.
- **Lexical Search (SQLite FTS5 BM25)**: Native `chunks_fts` virtual table searching `content`, `section`, `topic`, and `tags` in `< 2 ms`.
- **Reciprocal Rank Fusion (RRF)**: Merges vector and lexical ranks using standard reciprocal scoring (`score = 1 / (60 + rank)`).
- **LLM Reflection & Scoring**: Top fused chunks pass through `gpt-4o-mini` reflection prompt scoring each chunk from `0-10`. If scores are low (< 3), the system triggers fallback intent handling.

### 🏢 2. Dynamic Business & AI Persona System
- Configured dynamically via D1 Database (`system_settings` table) and managed live through the Angular Admin UI:
  - **Company Name**: Enterprise organization name (e.g., *Nevada State Contractors Board*).
  - **Assistant Name**: AI Bot identity.
  - **Domain Hint**: Business context and regulatory guidelines (e.g., *NRS Chapter 624 / NAC Chapter 624*).
  - **Brand Tone**: Professional, customer-friendly, authoritative.
  - **Primary Language**: System response language.

### 🚀 3. 3-Layer Query Caching Architecture
- **Layer 1 — KV Exact Cache (< 10 ms)**: Hashed query lookup using Web Crypto SHA-256 in Cloudflare KV.
- **Layer 2 — Semantic Cache (< 50 ms)**: `VECTORIZE_CACHE` checks cosine similarity (threshold ≥ 0.95) against past answered queries.
- **Layer 3 — Full RAG Pipeline (Fallback)**: Executes Dual Hybrid Retrieval, LLM reflection, and streams/returns the answer, writing back to KV and Vectorize caches automatically.
- **Instant Cache Invalidation**: Saving settings or deleting documents automatically purges KV and Vectorize caches.

### 📑 4. Scalable RAG Multi-Format Extraction Microservice (`/scalable-rag`)
- **Free Edge Pipeline ($0 Cost)**: Instant extraction for `TXT`, `DOCX`, `CSV`, `XLSX`, `PPTX`, `JSON`, `MD`.
- **Text Auto-Rerouting**: Plain text files uploaded with `ai-full` mode are automatically rerouted to the Free Edge pipeline to save Vision LLM cost & time.
- **AI Vision 300 DPI Pipeline**: PDF and image documents rendered at 300 DPI and processed through GPT-4o Vision OCR.
- **3-Tier Hierarchical Chunking**:
  - 📄 **Large Chunks (~1500 tokens)**: High-level overview & structural context.
  - 📝 **Medium Chunks (~400 tokens)**: Section policies & standard context.
  - 🔍 **Detail Chunks (~150 tokens)**: Granular rules, fee tables, and specific definitions.
- **Actionable Quota Error Surfacing**: Detects OpenAI billing/credit exhaustion and informs the admin directly with billing portal links.

### 📅 5. Temporal & Date Awareness
- Prompt templates dynamically anchor user queries to the current system date (`{currentDate}`).
- Relative time expressions (*"this year"*, *"latest regulations"*) map accurately to effective policy dates.

---

## 🏗️ Repository Architecture (Monorepo)

```text
chatbot-api-v1/
├── src/                                  # ⚡ Backend API (Cloudflare Worker + Hono)
│   ├── index.ts                          # Main entry point & Hono application routing
│   └── v1/
│       ├── controllers/                  # HTTP controllers (ask, data, auth, logs, qa, settings)
│       ├── pipeline/                     # Modular RAG pipeline (prepare → retrieve → execute)
│       ├── services/                     # 3-Layer Cache, D1 DB services, Vectorize integrations
│       ├── prompts/                      # System prompts (router, answer generation, reranker)
│       ├── routes/                       # API route definitions
│       └── utils/                        # Tracing, token ledgers, and helper utilities
│
├── chatbot-admin-v1/                     # 🅰️ Admin Dashboard Frontend (Angular 19)
│   └── src/app/modules/
│       ├── admin-module/ai-knowledge-module/  # Multi-format upload, topic preview & chunk editor
│       ├── admin-module/business-persona/     # Live company settings & brand tone management
│       ├── admin-module/thread-observability/ # Real-time trace & execution logs
│       └── shared/                       # API services & auth interceptors
│
├── scalable-rag/                         # 📑 Microservice Engine (Vision OCR & 3-Tier Chunks)
│   ├── src/extraction/                   # unpdf, mammoth, & GPT-4o Vision engines
│   └── src/chunking/                     # Adaptive category-aware tree chunker & classifier
│
├── migrations/                           # 🗄️ D1 SQLite Database Schema & Migration Files
│   ├── 0012_fts5_schema.sql              # FTS5 Virtual Tables (chunks_fts, document_chunks_fts) & triggers
│   └── 0013_system_settings.sql          # Business Persona system settings schema
│
├── wrangler.toml                         # ⚙️ Worker bindings (D1, KV CACHE/CONFIG, Vectorize)
├── changes.md                            # 📜 Complete 12-section master changelog
└── README.md                             # 📖 System documentation
```

---

## 🗄️ Database Schema & Migrations

All D1 SQLite migrations are stored under the [`migrations/`](./migrations) directory:

| Migration File | Description |
| --- | --- |
| `0012_fts5_schema.sql` | Creates `chunks_fts` and `document_chunks_fts` virtual tables using FTS5, plus `INSERT`, `UPDATE`, and `DELETE` SQL triggers for automated indexing. |
| `0013_system_settings.sql` | Creates `system_settings` table for Company Name, Assistant Name, Domain Hint, Brand Tone, and Primary Language. |
| `0013_thread_summary.sql` | Adds multi-turn thread summary tracking. |
| `chunks.sql` | Base chunk table (`chunk_id`, `file_id`, `section`, `topic`, `content`, `tags`). |
| `files.sql` | File metadata & processing status tracking. |
| `users.sql` / `auth.sql` | Admin authentication & user management. |

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20 or later
- **Cloudflare CLI**: `npx wrangler`
- **OpenAI API Key**: Active key with billing credits

### 2. Environment Variables (`.dev.vars`)
Create `.dev.vars` in the repository root:
```dotenv
OPENAI_API_KEY=sk-proj-your-openai-key
ADMIN_API_KEY=admin-secret-key-123
JWT_SECRET=super-secret-jwt-key-456
```

Create `scalable-rag/.dev.vars`:
```dotenv
OPENAI_API_KEY=sk-proj-your-openai-key
ADMIN_API_KEY=admin-secret-key-123
```

### 3. Run Development Servers

#### Start Backend Worker API (Port 8787)
```bash
npm install
npx wrangler dev --port 8787
```

#### Start Scalable RAG Worker (Port 8788)
```bash
cd scalable-rag
npm install
npx wrangler dev --port 8788
```

#### Start Angular Admin Dashboard (Port 4200)
```bash
cd chatbot-admin-v1
npm install
npx ng serve --port 4200
```

Access the Admin UI at: `http://localhost:4200`

---

## 📊 Core API Endpoints

### 💬 Q&A & Search API
| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/ask` | `POST` | Ask question (checks Layer 1 KV & Layer 2 Vectorize cache first) |
| `/api/ask/stream` | `POST` | Server-Sent Events (SSE) streaming response |

### ⚙️ Business Persona Settings API
| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/settings` | `GET` | Fetch current company name, persona, domain hint & tone |
| `/api/settings` | `POST` | Save updated business persona & **purge query cache** |

### 📄 Ingestion & Knowledge API
| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/data/preview-chunks` | `POST` | Multi-format extraction & 3-tier chunk preview |
| `/api/data/save-file-chunks` | `POST` | Finalize & index approved chunks to D1, Vectorize & FTS5 |
| `/api/data/delete-file/:id` | `DELETE` | Delete document, purge vectors & clear cache |

---

## 📜 Benchmark Results

The system was evaluated against a **22-scenario multi-turn RAG stress test suite (200+ conversation turns)**:
- **Exact Numerical Retrieval Score**: 100%
- **Context-Aware Fee Disambiguation**: 100%
- **Knowledge Boundary Enforcement**: 100%
- **Overall Benchmark Grade**: **A+ (98.5%)**

---

## 📄 License & Attribution

Internal Enterprise Project — All Rights Reserved. Built with Cloudflare Workers, Hono, Angular, and OpenAI.
