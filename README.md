# 🤖 Chatbot API — Enterprise RAG Platform, Web Crawler & Edge AI (v1)

A production-grade, multi-tenant **Retrieval-Augmented Generation (RAG)** platform, web crawler engine, and administration portal built on **Cloudflare Workers**, **SQLite FTS5 (Cloudflare D1)**, **Cloudflare Vectorize**, **Cloudflare Browser Run (Puppeteer)**, **Cloudflare KV Cache**, and **Angular 16+**.

The entire codebase is structured as a **unified monorepo** under branch `version-2`, combining the **Backend Worker API**, **Scalable RAG Extraction Microservice**, and **Angular Admin Portal**.

---

## 🏗️ Monorepo Architecture & Folder Structure

```text
chatbot-api-v1 (branch: version-2)
├── src/                                  # ⚡ 1. Backend Worker API (Cloudflare Worker + Hono)
│   ├── index.ts                          # Main entry point & Hono routing
│   └── v1/
│       ├── controllers/                  # HTTP controllers (ask, crawler, data, auth, logs, settings, traces)
│       ├── pipeline/                     # 3-Stage RAG Pipeline (prepare → retrieve → execute)
│       ├── services/                     # 3-Layer Cache, Crawler Engine, D1 DB services, Vectorize
│       │   ├── crawler.service.ts        # Cloudflare Browser Run Puppeteer + Jina Anti-Bot Fallback
│       │   ├── fallback-clustering.service.ts # Aggregative TF-IDF + Cosine Fallback Intelligence
│       │   └── db/                       # D1 SQLite Database Access Objects (files, chunks, traces, settings)
│       ├── prompts/                      # System prompts (router, answer generation, reranker, persona)
│       ├── routes/                       # API route definitions (/ask, /crawler, /data, /message-traces, /settings)
│       └── utils/                        # Developer Trace Logger, Token Ledgers, KaTeX math helpers
│
├── chatbot-admin-v1/                     # 🅰️ 2. Angular Admin Portal (Angular 16+)
│   ├── src/app/modules/
│   │   ├── admin-module/
│   │   │   ├── ai-knowledge-module/      # Multi-format upload, Web Crawling & Auto-Sync Schedule manager
│   │   │   ├── chuncks/                  # 3-Tier Chunks Editor, Tag Manager & Vector Re-indexer
│   │   │   ├── chat-analytics/           # Analytics KPIs, Word Cloud & Fallback Intelligence clustering
│   │   │   ├── threads-module/           # User Conversations & Developer Trace Inspector
│   │   │   └── business-persona/         # Live Company Identity & AI Brand Tone Management
│   │   └── shared/                       # Floating Admin Chatbot Widget with Web Citations & Redirection
│   ├── package.json
│   └── angular.json
│
├── scalable-rag/                         # 📑 3. Scalable RAG Microservice (Vision OCR & 3-Tier Chunks)
│   ├── src/
│   │   ├── extraction/                   # unpdf, mammoth, & GPT-4o Vision OCR engines
│   │   └── chunking/                     # 3-Tier Hierarchical Chunker (Large, Medium, Small)
│   └── wrangler.jsonc
│
├── migrations/                           # 🗄️ Cloudflare D1 Database Migrations
│   ├── 0012_fts5_schema.sql              # FTS5 Virtual Tables & Automated SQL Triggers
│   └── 0013_system_settings.sql          # Business Persona system settings schema
│
├── wrangler.jsonc                         # ⚙️ Cloudflare Worker Bindings & Environment Variables
└── README.md                             # 📖 Developer Documentation
```

---

## 🌟 Key Capabilities & Architectural Features

### 🌐 1. Cloudflare Browser Run Web Crawler Engine
- **Headless Chrome Rendering**: Uses `@cloudflare/puppeteer` (`env.MY_BROWSER`) to render JavaScript SPAs, execute dynamic DOM scripts, and clean HTML to structured Markdown.
- **Anti-Bot Bypass Fallback**: Automatically routes around Akamai/Cloudflare anti-bot blocks (e.g. Tesla, energy sites) via Jina Reader Proxy fallback (`https://r.jina.ai/`).
- **Auto-Sync Schedule Selector**: Supports `Manual Only`, `Daily Every 24h`, `Weekly Every 7 Days`, and `Monthly Every 30 Days` with automated D1 `nextCrawlAt` scheduling.
- **Instant 3-Tier Ingestion**: Crawled web markdown is processed through 3-tier hierarchical chunking and embedded into 1536-dimensional Vectorize vectors in seconds.

### 🎯 2. Strict LLM Citation Filtering & Source Badging
- **Answer-Driven Filtering**: `formatRetrievedSources(pieces, answerText)` token-matches candidate chunks against the **actual generated LLM answer**, filtering out unreferenced documents.
- **Visual Source Badges**:
  - **`🌐 Web Crawled`**: Blue badge with a globe icon (`🌐 Clean Energy Careers Grow Here`). Clicking opens the live website URL directly in a new browser tab.
  - **`📄 Uploaded Doc`**: Purple badge with a document icon (`📄 Policy_Manual.pdf`). Clicking navigates to the AI Knowledge manager.

### ✏️ 3. Linked 3-Tier Multi-Tier Knowledge Chunk Editor
- **3-Tier Hierarchy**:
  - 📄 **Large Tier (~3000 tokens)**: High-level overview & structural context.
  - 📝 **Medium Tier (~1200 tokens)**: Section policies & standard context.
  - 🔍 **Small Tier (~300 tokens)**: Granular rules, fee tables, and definitions.
- **In-Place Tabbed Modal**: Editing any chunk opens a 960px tabbed editor showing linked parent/child chunks for that section.
- **Bulk D1 & Vectorize Re-Indexing**: Updating chunk text or tags automatically re-embeds vectors in Cloudflare Vectorize and updates D1 SQLite in a single transaction.

### 🔍 4. Dual Hybrid Search & RRF Reranking
- **Vector Search (Cloudflare Vectorize)**: 1536-dimensional OpenAI embeddings (`text-embedding-3-small`) with cosine distance matching.
- **Lexical Search (SQLite FTS5 BM25)**: Native `chunks_fts` virtual table searching `content`, `section`, `topic`, and `tags` in `< 2 ms`.
- **Reciprocal Rank Fusion (RRF)**: Merges vector and lexical ranks using `score = 1 / (60 + rank)`.

### 📊 5. Developer Trace Inspector & Observability
- Access real-time execution logs for any user message at `/dashboard/threads/detail-page/:id`.
- Inspect step timings (`history_load`, `preflight`, `embed_speculative`, `rag_query`), planner intent parsing, RRF fusion scores, and raw JSON traces.

### 🚀 6. 3-Layer Speed & Semantic Caching Engine
- **Layer 1 — KV Exact Cache (< 10 ms)**: Hashed query lookup using Web Crypto SHA-256 in Cloudflare KV.
- **Layer 2 — Semantic Cache (< 50 ms)**: `VECTORIZE_CACHE` checks cosine similarity (threshold ≥ 0.95) against past answered queries.
- **Layer 3 — Full RAG Pipeline (Fallback)**: Executes Dual Hybrid Retrieval, LLM reflection, and streams/returns the answer, writing back to KV and Vectorize caches.

---

## 🚀 Quickstart & Developer Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or later
- **Cloudflare CLI**: `npx wrangler@latest`
- **Angular CLI**: `npx ng`
- **OpenAI API Key**: Active key with billing credits

---

### 2. Environment Configuration

Create `.dev.vars` in the repository root (`fervent-curie/.dev.vars`):
```dotenv
OPENAI_API_KEY=sk-proj-your-openai-api-key
ADMIN_API_KEY=admin-secret-key-123
JWT_SECRET=super-secret-jwt-key-456
CF_ACCOUNT_ID=your-cloudflare-account-id
CF_AI_SEARCH_TOKEN=your-cloudflare-api-token
```

Create `scalable-rag/.dev.vars`:
```dotenv
OPENAI_API_KEY=sk-proj-your-openai-api-key
ADMIN_API_KEY=admin-secret-key-123
JWT_SECRET=super-secret-jwt-key-456
```

---

### 3. Run Development Servers

To run the full stack locally, open 3 terminal windows:

#### 🟢 Terminal 1: Worker API (`fervent-curie` - Port 8787)
```bash
npm install
npm run dev
```
*Server runs on `http://127.0.0.1:8787`*

#### 🟢 Terminal 2: Scalable RAG Microservice (`scalable-rag` - Port 8788)
```bash
cd scalable-rag
npm install
npx wrangler dev --port 8788
```
*Microservice runs on `http://127.0.0.1:8788`*

#### 🟢 Terminal 3: Angular Admin Portal (`chatbot-admin-v1` - Port 4200)
```bash
cd chatbot-admin-v1
npm install
npx ng serve --port 4200
```
*Admin Dashboard opens at `http://localhost:4200`*

---

## 📡 Core API Reference

All requests to protected endpoints require the `x-api-key` header (e.g. `x-api-key: admin-secret-key-123`).

### 💬 Q&A & Streaming API
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/ask` | `POST` | Asynchronous JSON Q&A response returning `answer` and strictly filtered `sources` |
| `/ask/stream` | `POST` | Server-Sent Events (SSE) streaming endpoint returning chunked tokens and `done` metadata |

#### Request Payload:
```json
{
  "message": "What is the warranty period for Solar Roof?",
  "userId": "admin_user",
  "threadId": "thread_12345",
  "bypassCache": false
}
```

---

### 🌐 Web Crawler API
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/crawler/crawl` | `POST` | Triggers web crawl, converts HTML to Markdown, runs 3-tier chunking, and indexes vectors |
| `/crawler/active-schedules` | `GET` | Lists all active web URLs with recurring auto-sync schedules (`daily`, `weekly`, `monthly`) |

#### Request Payload:
```json
{
  "url": "https://www.solarenergy.org/",
  "crawlSchedule": "daily"
}
```

---

### 📑 AI Knowledge & Chunks API
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/data/files-with-count` | `GET` | Fetches all knowledge items (Docs + Web Crawls) with total chunk counts |
| `/data/chunks-all` | `GET` | Debounced search and paginated list of all knowledge chunks |
| `/data/chunks/:chunkId/related` | `GET` | Fetches linked Small, Medium, and Large tier chunks for a document section |
| `/data/chunks/:chunkId` | `POST` | Bulk updates D1 chunk content/tags and re-indexes Cloudflare Vectorize embeddings |

---

### 📊 Observability & Traces API
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/message-traces/messages/:messageId/trace` | `GET` | Returns full trace JSON (`timings`, `planner`, `vectorHits`, `logs`) for a message |
| `/analytics/fallback-clusters` | `POST` | Runs aggregative TF-IDF + Cosine similarity clustering on unanswered user queries |

---

### ⚙️ Business Persona API
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/settings` | `GET` | Returns current company name, assistant identity, domain hint, brand tone, and primary language |
| `/settings` | `POST` | Updates system settings in D1 and automatically purges query caches |

---

## 🗄️ Database Setup & Migrations

Deploy database schema updates to Cloudflare D1 using Wrangler:

```bash
# Execute migration against local D1 database
npx wrangler d1 execute DB --local --file=./migrations/0012_fts5_schema.sql
npx wrangler d1 execute DB --local --file=./migrations/0013_system_settings.sql

# Execute migration against production Cloudflare D1 database
npx wrangler d1 execute DB --remote --file=./migrations/0012_fts5_schema.sql
npx wrangler d1 execute DB --remote --file=./migrations/0013_system_settings.sql
```

---

## 🌿 Git Branching & Contribution Workflow

- **Primary Working Branch**: `version-2`
- **Main Monorepo Repository**: [`abanchaudry/chatbot-api-v1`](https://github.com/abanchaudry/chatbot-api-v1)

```bash
# Pull latest changes from version-2
git checkout version-2
git pull origin version-2

# Commit & push updates
git add .
git commit -m "Your descriptive commit message"
git push origin version-2
```

---

## 📄 License & System Requirements

Internal Enterprise Project — All Rights Reserved. Built with Cloudflare Workers, Hono, Angular, and OpenAI.
