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

### 🗄️ 1. 3-Physical Dataset Architecture & Priority Hierarchy
- **3 Dedicated Cloudflare Vectorize Indexes**:
  - `VECTORIZE_ADMIN` (`chatbot-admin-index-dev`): Directly uploaded executive manuals, corporate policies, and administrative files. Highest truth authority (Weight: 1.25x).
  - `VECTORIZE_PDF` (`chatbot-pdf-index-dev`): Technical engineering datasheets, hardware manuals, and electrical schematics (Weight: 1.10x).
  - `VECTORIZE_WEB` (`chatbot-web-index-dev`): Public websites and crawled educational content (Weight: 1.00x).
- **Dynamic Dataset Toggling & Weighting**:
  - Administrators can enable/disable any knowledge base live from the Admin Panel or customize weighted Reciprocal Rank Fusion (RRF) priority multipliers.
  - Inactive datasets are automatically excluded from Vectorize, SQLite FTS5 lexical, and metadata queries.

### 🌐 2. Recursive Multi-Depth Web Crawler Engine
- **Recursive BFS Multi-Page Discovery**: Discovers all sub-links across domain variations (e.g. `www.` vs non-`www.`) up to customizable depth levels.
- **Automated XML Sitemap Ingestion**: Automatically detects `/sitemap.xml`, `/sitemap_index.xml`, and `/wp-sitemap.xml` for site-wide page discovery.
- **Headless Chrome & Anti-Bot Bypass**: Uses `@cloudflare/puppeteer` (`env.MY_BROWSER`) with automated Jina Reader Proxy fallback for blocked domains.
- **Auto-Sync Schedule Selector**: Supports `Manual Only`, `Daily Every 24h`, `Weekly Every 7 Days`, and `Monthly Every 30 Days`.

### 🛡️ 3. Resilient Multi-Signal Evidence Gate & Cache Partitioning
- **Multi-Signal Grounding Evaluation**: Evaluates substantive text length ($\ge 40$ chars), semantic reranker coverage ($\ge 40\%$), exact entity/phrase matches, and vector score thresholds ($\ge 40$) to prevent false negative fallbacks on conversational queries.
- **Signature-Aware Cache Partitioning**: Every cache key is bound to the active dataset signature (e.g. `qcache:a1_p1_w1:<hash>`), ensuring $0\text{ms}$ instantaneous cache invalidation when any dataset toggle or weight is modified.
- **Automatic Deep KV Cache Purging**: System settings modifications, file deletions, and chunk updates automatically trigger deep key purges across Cloudflare KV.

### 🎯 4. Strict LLM Citation Filtering & Source Badging
- **Answer-Driven Filtering**: `formatRetrievedSources(pieces, answerText)` token-matches candidate chunks against the **actual generated LLM answer**, filtering out unreferenced documents.
- **Visual Source Badges**:
  - **`📄 Admin Doc`**: Purple badge with document icon for executive policy uploads.
  - **`📚 PDF Reference`**: Indigo badge with book icon for technical hardware datasheets.
  - **`🌐 Web Crawled`**: Blue badge with globe icon linking to live web sources.

### ✏️ 5. Linked 3-Tier Multi-Tier Knowledge Chunk Editor
- **3-Tier Hierarchy**:
  - 📄 **Large Tier (~3000 tokens)**: High-level overview & structural context.
  - 📝 **Medium Tier (~1200 tokens)**: Section policies & standard context.
  - 🔍 **Small Tier (~300 tokens)**: Granular rules, fee tables, and definitions.
- **In-Place Tabbed Modal**: Editing any chunk opens a 960px tabbed editor showing linked parent/child chunks for that section.
- **Bulk D1 & Vectorize Re-Indexing**: Updating chunk text or tags automatically re-embeds vectors in Cloudflare Vectorize and updates D1 SQLite in a single transaction.

### 📊 6. Developer Trace Inspector & Observability
- Access real-time execution logs for any user message at `/dashboard/threads/detail-page/:id`.
- Inspect step timings (`history_load`, `preflight`, `embed_speculative`, `rag_query`), planner intent parsing, RRF fusion scores, and raw JSON traces.

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
