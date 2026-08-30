# 🤖 Chatbot API — Enterprise Multi-Tenant SaaS, BYOK Engine & Edge AI (v2)

A production-grade, edge-native **Multi-Tenant SaaS Platform**, **Bring Your Own Key (BYOK) Vector Engine**, web crawler, and administration portal built on **Cloudflare Workers**, **SQLite FTS5 (Cloudflare D1)**, **Cloudflare Vectorize**, **Cloudflare Browser Run (Puppeteer)**, **Cloudflare KV Cache**, and **Angular 16+**.

The codebase is structured as a **unified monorepo** on branch [`multitenant-version`](https://github.com/abanchaudry/chatbot-api-v1/tree/multitenant-version). For an in-depth technical deep dive and production deployment instructions, see [**`MULTI_TENANT_ARCHITECTURE.md`**](./MULTI_TENANT_ARCHITECTURE.md).

---

## 🏗️ Monorepo Architecture & Folder Structure

```text
chatbot-api-v1 (branch: multitenant-version)
├── src/                                  # ⚡ 1. Backend Worker API (Cloudflare Worker + Hono)
│   ├── index.ts                          # Main entry point & Hono routing
│   └── v1/
│       ├── controllers/                  # HTTP controllers (super-admin, ask, crawler, data, auth, settings)
│       ├── pipeline/                     # 3-Stage RAG Pipeline (prepare → retrieve → execute)
│       ├── services/                     # Multi-Tenant Tenant Resolver, Cloudflare Vectorize REST Client, DB services
│       │   ├── tenant.service.ts         # Resolves tenant config, decrypts BYOK secrets & routes LLM
│       │   ├── cloudflare-vectorize-rest.service.ts # Dynamic Vectorize v2 REST Client for BYOK clients
│       │   ├── crawler.service.ts        # Cloudflare Browser Run Puppeteer + Jina Anti-Bot Fallback
│       │   ├── fallback-clustering.service.ts # Aggregative TF-IDF + Cosine Fallback Intelligence
│       │   └── db/                       # D1 SQLite Access Objects (clients, secrets, auth, files, chunks)
│       ├── prompts/                      # System prompts (router, answer generation, reranker, persona)
│       ├── routes/                       # API routes (/super-admin, /ask, /crawler, /data, /settings)
│       └── utils/                        # Crypto AES-GCM 256-bit helpers, Token Ledgers, Trace Loggers
│
├── chatbot-admin-v1/                     # 🅰️ 2. Angular Admin Portal (Angular 16+)
│   ├── src/app/modules/
│   │   ├── admin-module/
│   │   │   ├── super-admin/              # Super Admin Business Manager, BYOK Secrets, & Global Stats
│   │   │   ├── ai-knowledge-module/      # Multi-format upload, Web Crawling & Auto-Sync Schedule manager
│   │   │   ├── chuncks/                  # 3-Tier Chunks Editor, Tag Manager & Vector Re-indexer
│   │   │   ├── chat-analytics/           # Analytics KPIs, Word Cloud & Fallback Intelligence clustering
│   │   │   ├── threads-module/           # User Conversations & Developer Trace Inspector
│   │   │   └── business-persona/         # Live Company Identity & AI Brand Tone Management
│   │   └── shared/                       # Sidebar Workspace Switcher & Chatbot Widget
│   ├── package.json
│   └── angular.json
│
├── scalable-rag/                         # 📑 3. Scalable RAG Microservice (Vision OCR & 3-Tier Chunks)
│   ├── src/
│   │   ├── extraction/                   # unpdf, mammoth, & GPT-4o Vision OCR engines
│   │   └── chunking/                     # 3-Tier Hierarchical Chunker (Large, Medium, Small)
│   └── wrangler.jsonc
│
├── migrations/                           # 🗄️ Cloudflare D1 Database Migrations (17 Migrations)
│   ├── 0016_multi_tenant_schema.sql      # Multi-tenant tables, client secrets, & foreign keys
│   └── 0017_fallback_multi_tenant.sql    # Scoped fallback intelligence & clustering
│
├── wrangler.jsonc                         # ⚙️ Cloudflare Worker Bindings & Environment Variables
├── MULTI_TENANT_ARCHITECTURE.md          # 📖 Developer Multi-Tenant & Deployment Guide
└── README.md                             # 📖 General Documentation
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

### 🌐 2. Autonomous 200-Page Web Crawler Engine
- **Autonomous Multi-Depth Discovery**: Discovers all sub-links across domain variations (e.g. `www.` vs non-`www.`) up to **200 pages max** without requiring manual limit selection.
- **Automated XML Sitemap Ingestion**: Automatically detects `/sitemap.xml`, `/sitemap_index.xml`, and `/wp-sitemap.xml` for site-wide page discovery.
- **Headless Chrome & Anti-Bot Bypass**: Uses `@cloudflare/puppeteer` (`env.MY_BROWSER`) with automated Jina Reader Proxy fallback for blocked domains.
- **Auto-Sync Schedule Selector**: Supports `Manual Only`, `Daily Every 24h`, `Weekly Every 7 Days`, and `Monthly Every 30 Days`.

### 📑 3. Multimodal 300–600 DPI Vision OCR & 200-Page Ingestion Pipeline
- **Configurable DPI Scale (300 to 600 DPI)**: Dynamically control rendering resolution for dense engineering blueprints, tables, and fine-print PDFs.
- **200-Page Ingestion Engine**: Adaptive image chunk batching and token budgeting to rasterize and verbatim-transcribe documents up to 200 pages without context truncations.
- **3 Hierarchical Chunking Tiers**:
  - 📄 **Large Tier (~3000 tokens)**: High-level overview & structural context.
  - 📝 **Medium Tier (~1200 tokens)**: Section policies & standard context.
  - 🔍 **Small Tier (~300 tokens)**: Granular rules, fee tables, and definitions.

### 🛡️ 4. Resilient Multi-Signal Evidence Gate & Cache Partitioning
- **Multi-Signal Grounding Evaluation**: Evaluates substantive text length ($\ge 40$ chars), semantic reranker coverage ($\ge 40\%$), exact entity/phrase matches, and vector score thresholds ($\ge 40$) to prevent false negative fallbacks.
- **Signature-Aware Cache Partitioning**: Every cache key is bound to the active dataset signature (e.g. `qcache:a1_p1_w1:<hash>`), ensuring $0\text{ms}$ instantaneous cache invalidation when any dataset toggle or weight is modified.
- **Deep KV Cache Purging**: System settings modifications, file deletions, and chunk updates automatically trigger deep key purges across Cloudflare KV.

### 🎯 5. Interactive In-App Citation Routing, Auto-Pagination & Golden Glow Pulse
- **In-App Citation Navigation**: Clicking any citation chip in the Admin Chat widget navigates directly to the **AI Knowledge** page, automatically flips to the correct pagination page, and scrolls the cited file into view.
- **Golden Glow Pulse Animation**: The cited document row is highlighted with a 4.5s golden glow pulse (`@keyframes highlightRowPulse`).
- **Web Link Direct Access**: Includes an inline `🔗` external link for direct browser visits to original web sources.
- **Refusal Citation Suppression**: Citations are cleanly suppressed on out-of-scope guardrail refusals.

### ✏️ 6. Linked 3-Tier Multi-Tier Knowledge Chunk Editor
- **In-Place Tabbed Modal**: Editing any chunk opens a 960px tabbed editor showing linked parent/child chunks for that section.
- **Bulk D1 & Vectorize Re-Indexing**: Updating chunk text or tags automatically re-embeds vectors in Cloudflare Vectorize and updates D1 SQLite in a single transaction.

### 📊 7. Developer Trace Inspector & Observability
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

- **Primary Multi-Tenant Branch**: `multitenant-version`
- **Main Monorepo Repository**: [`abanchaudry/chatbot-api-v1`](https://github.com/abanchaudry/chatbot-api-v1)

```bash
# Pull latest changes from multitenant-version
git checkout multitenant-version
git pull origin multitenant-version

# Commit & push updates
git add .
git commit -m "Your descriptive commit message"
git push origin multitenant-version
```

---

## 📄 License & System Requirements

Internal Enterprise Project — All Rights Reserved. Built with Cloudflare Workers, Hono, Angular, and OpenAI.
