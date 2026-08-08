# Chatbot API — Version 2 (Full-Stack RAG & Edge AI Platform)

A production-grade, full-stack Retrieval-Augmented Generation (RAG) platform built on Cloudflare Workers and Angular 19. The service features a **3-Layer Query Caching Engine**, multi-format document extraction microservice (PDF, DOCX, Vision OCR), real-time thread observability, and an Angular 19 admin control dashboard.

---

## 🌟 Version 2 Key Features

- **🚀 3-Layer Query Cache Architecture**:
  - **Layer 1 (KV Exact Match, < 10 ms)**: Deterministic SHA-256 Web Crypto hashing on normalized queries.
  - **Layer 2 (Vectorize Semantic Cache, < 50 ms)**: Dedicated `VECTORIZE_CACHE` 1536-dim index checking cosine similarity (threshold ≥ 0.95).
  - **Layer 3 (Full RAG Pipeline, Fallback)**: Multi-pass vector/D1 search, LLM reranking, and `gpt-4o-mini` generation with automatic cache writeback.
- **📄 Scalable RAG Multi-Format Engine (`/scalable-rag`)**:
  - Offline $0 edge extraction for TXT, DOCX, CSV, PPTX, XLSX.
  - GPT-4o Vision & 300 DPI high-resolution OCR rendering for scanned PDFs and images.
  - 3-Tier Hierarchical Chunking (📄 Overview, 📝 Context, 🔍 Detail) and auto-classification.
- **🅰️ Integrated Admin Panel (`/chatbot-admin-v1`)**:
  - Interactive Angular 19 dashboard for file uploads, extraction pipeline selection, preview table editing, and chunk review.
  - Real-time step-by-step thread observability and pipeline trace inspection.
- **🔄 Auto-Invalidation**: Automatic cache purging on document deletion to prevent stale answers.

---

## 🏗️ Repository Architecture (Monorepo)

```text
chatbot-api-v1/
├── src/                                  # ⚡ Backend API (Cloudflare Worker + Hono)
│   ├── index.ts                          # Main entry point & Hono application
│   └── v1/
│       ├── controllers/                  # HTTP controllers (ask, data, auth, logs, qa)
│       ├── pipeline/                     # Modular RAG pipeline (prepare → retrieve → execute)
│       ├── services/                     # 3-Layer Cache, D1 DB services, Vectorize integrations
│       ├── prompts/                      # System prompts (router, answer generation, reranker)
│       ├── routes/                       # API route definitions
│       └── utils/                        # Tracing, token ledgers, and helper utilities
│
├── chatbot-admin-v1/                     # 🅰️ Admin Dashboard Frontend (Angular 19)
│   └── src/app/modules/
│       ├── admin-module/ai-knowledge-module/  # Multi-format upload & chunk review UI
│       ├── admin-module/thread-observability/ # Real-time trace & execution logs
│       └── shared/                       # API services & auth interceptors
│
├── scalable-rag/                         # 📑 Microservice Engine (Vision OCR & 3-Tier Chunks)
│   ├── src/extraction/                   # unpdf, mammoth, & GPT-4o Vision engines
│   └── src/chunking/                     # Adaptive category-aware tree chunker
│
├── migrations/                           # 🗄️ D1 SQLite Database Schema Files (11 migrations)
├── wrangler.toml                         # ⚙️ Worker bindings (D1, KV CACHE/CONFIG, Vectorize)
├── changes.md                            # 📜 Complete system changelog
└── DEVELOPER_SETUP.md                    # 📖 Developer setup guide
```

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js 20 or later
- npm
- Cloudflare CLI (`npx wrangler`)
- OpenAI API Key

### 2. Configure Local Environment & Secrets
Create `.dev.vars` in the root directory (automatically ignored by Git):
```dotenv
OPENAI_API_KEY=your-openai-api-key
ADMIN_API_KEY=your-admin-api-key
JWT_SECRET=your-jwt-signing-secret
```

### 3. Install Dependencies & Start Services

#### Backend Worker API (Port 8787)
```bash
npm install
npm run dev
```

#### Scalable RAG Microservice (Port 8787 / Subfolder)
```bash
cd scalable-rag
npm install
npm run dev
```

#### Angular Admin Dashboard (Port 4200)
```bash
cd chatbot-admin-v1
npm install
ng serve --port 4200
```

---

## 📊 API Route Overview

| Route | Method | Description |
| --- | --- | --- |
| `/ask` | `POST` | RAG Question Answering (with Layer 1 & 2 Cache Check) |
| `/ask/stream` | `POST` | SSE Streaming RAG Question Answering |
| `/data/preview-chunks` | `POST` | Multi-format extraction & preview chunking |
| `/data/save-file-chunks` | `POST` | Finalize & index reviewed chunks into R2/D1/Vectorize |
| `/data/delete-file/:id` | `DELETE` | Delete file, remove vectors, and purge query cache |
| `/thread` | `GET/POST` | Conversation threads & message history |
| `/auth` | `POST` | JWT Authentication & admin login |
| `/message-traces` | `GET` | Execution step telemetry & observability traces |

---

## 🔒 Security & Environment Safety

- `.dev.vars` and `scalable-rag/.dev.vars` are **strictly ignored** via `.gitignore`. Never commit secret keys.
- Production environment bindings use Cloudflare Secrets (`npx wrangler secret put`).
- Admin routes require valid JWT tokens or `ADMIN_API_KEY` header.

---

## 📜 Documentation

- See [changes.md](./changes.md) for full architectural changelog.
- See [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) for database migration order and Cloudflare setup.

