# 🤖 Chatbot API — Enterprise Multi-Tenant SaaS & Dedicated Cloudflare Infrastructure (v2.0)

A production-grade, edge-native **Multi-Tenant SaaS Platform** with **Automated Dedicated Cloudflare Resource Provisioning**, **Bring Your Own OpenAI Key (BYOK)**, 5-Step Registration Wizard, autonomous 200-page web crawler, 300–600 DPI Multimodal Vision OCR, and administration portal built on **Cloudflare Workers (Hono)**, **Cloudflare D1 (SQLite FTS5)**, **Cloudflare Vectorize**, **Cloudflare KV**, **Cloudflare R2**, and **Angular 16+**.

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
│       ├── services/                     # Cloudflare Provisioner, D1 & KV REST Clients, Vectorize REST Client
│       │   ├── cloudflare-provisioner.service.ts # Orchestrates automated D1, KV, Vectorize & R2 creation
│       │   ├── cloudflare-d1-rest.service.ts     # Dynamic D1 REST client implementing prepare().bind().all()
│       │   ├── cloudflare-kv-rest.service.ts     # Dynamic KV REST client implementing get()/put()/delete()
│       │   ├── cloudflare-vectorize-rest.service.ts # Dynamic Vectorize v2 REST Client for per-tenant indexes
│       │   ├── tenant.service.ts         # Resolves tenant config, decrypts OpenAI BYOK keys & routes resources
│       │   ├── crawler.service.ts        # Cloudflare Browser Run Puppeteer + Jina Anti-Bot Fallback
│       │   ├── fallback-clustering.service.ts # Aggregative TF-IDF + Cosine Fallback Intelligence
│       │   └── db/                       # D1 SQLite Access Objects (clients, resources, api_key_requests, auth)
│       ├── prompts/                      # System prompts (router, answer generation, reranker, persona)
│       ├── routes/                       # API routes (/super-admin, /ask, /crawler, /data, /settings)
│       └── utils/                        # Crypto AES-GCM 256-bit helpers, Token Ledgers, Trace Loggers
│
├── chatbot-admin-v1/                     # 🅰️ 2. Angular Admin Portal (Angular 16+)
│   ├── src/app/modules/
│   │   ├── admin-module/
│   │   │   ├── super-admin/              # 5-Step Registration Wizard, Dedicated Resource Manifests & Key Switch Reviews
│   │   │   ├── assistant/                # Business Persona & In-App OpenAI Key Management (BYOK / Platform Switch)
│   │   │   ├── ai-knowledge-module/      # Multi-format upload, Web Crawling & Auto-Sync Schedule manager
│   │   │   ├── chuncks/                  # 3-Tier Chunks Editor, Tag Manager & Vector Re-indexer
│   │   │   ├── chat-analytics/           # Analytics KPIs, Word Cloud & Fallback Intelligence clustering
│   │   │   ├── threads-module/           # User Conversations & Developer Trace Inspector
│   │   │   └── layout/                   # Sidebar Workspace Switcher & Theme Layouts
│   │   └── shared/                       # Chatbot Widget & Modal Dialogs
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
│   ├── 0016_multi_tenant_schema.sql      # Multi-tenant tables, client secrets, & foreign keys
│   ├── 0017_fallback_multi_tenant.sql    # Scoped fallback intelligence & clustering
│   ├── 0018_per_tenant_resources.sql     # Dedicated client_resources & api_key_requests tables
│   └── 0019_add_client_contact_email.sql # Client contact email support
│
├── wrangler.toml                         # ⚙️ Cloudflare Worker Bindings & Environment Variables
├── MULTI_TENANT_ARCHITECTURE.md          # 📖 Developer Multi-Tenant & Deployment Guide
└── README.md                             # 📖 General Documentation
```

---

## 🌟 Key Architecture & Features

### 🛡️ 1. Automated Per-Tenant Cloudflare Infrastructure (Zero Client CF Exposure)
Clients never interact with Cloudflare credentials. Every business receives its own dedicated set of Cloudflare resources provisioned automatically under the platform's Cloudflare account:
* **Dedicated D1 Database**: `chatbot-{slug}-db` (Isolated relational database with full schema: files, chunks with FTS5, threads, messages, traces, settings).
* **Dedicated KV Fast Cache**: `chatbot-{slug}-cache` (Sub-millisecond exact query cache namespace).
* **4 Dedicated Vectorize Indexes**:
  * `chatbot-{slug}-admin` (1536-dim Cosine index for admin curated knowledge)
  * `chatbot-{slug}-pdf` (1536-dim Cosine index for PDF manual chunks)
  * `chatbot-{slug}-web` (1536-dim Cosine index for crawled web content)
  * `chatbot-{slug}-qcache` (1536-dim Vectorize v2 index for L2 semantic similarity query cache)
* **Dedicated R2 Storage Vault**: `chatbot-{slug}-storage` (Encrypted S3-compatible bucket for raw file storage).

---

### 🧙‍♂️ 2. Interactive 5-Step Business Registration Wizard
The single-page client creation form has been replaced by a modern 5-step registration wizard (`/dashboard/super-admin/add-client`):
1. **Step 1: Business Profile & Branding**: Business name, auto-generated slug preview, domain, contact email, and logo.
2. **Step 2: Dedicated Cloud Resources**: Real-time manifest preview showing the 7 isolated Cloudflare resources.
3. **Step 3: AI Intelligence & Billing**: Choice between **Platform Managed AI** (pooled quota) and **BYOK (Client OpenAI Key)** with AES-GCM 256-bit encryption.
4. **Step 4: Admin Credentials**: Initial administrative username and secure password generator.
5. **Step 5: Review & Confirmation**: Manifest confirmation with 1-click automated API provisioning.

---

### 🔑 3. In-App OpenAI Key Management & Super Admin Review Workflow
* **Business Persona (`/dashboard/assistant-information`)**:
  * Displays active AI billing status (**Platform Managed AI** vs **BYOK**).
  * Clients can provide or update their own OpenAI API key to switch to BYOK immediately.
  * BYOK clients can submit a **"Request switch to Platform Billing"** with custom notes.
* **Super Admin Dashboard (`/dashboard/super-admin/dashboard`)**:
  * Unified card header with segmented switch buttons (**Registered Businesses** vs **API Key Switch Requests**).
  * 1-click **Approve** and **Reject** buttons for Super Admin to review AI billing switch requests.

---

### 🌐 4. Autonomous 200-Page Web Crawler Engine
* **Autonomous Multi-Depth Discovery**: Discovers all sub-links across domain variations up to **200 pages max** without requiring manual limit selection.
* **Automated XML Sitemap Ingestion**: Automatically detects `/sitemap.xml`, `/sitemap_index.xml`, and `/wp-sitemap.xml` for site-wide page discovery.
* **Headless Chrome & Anti-Bot Bypass**: Uses `@cloudflare/puppeteer` (`env.MY_BROWSER`) with automated Jina Reader Proxy fallback for blocked domains.
* **Auto-Sync Schedule Selector**: Supports `Manual Only`, `Daily Every 24h`, `Weekly Every 7 Days`, and `Monthly Every 30 Days`.

---

### 📑 5. Multimodal 300–600 DPI Vision OCR & Ingestion Pipeline
* **Configurable DPI Scale (300 to 600 DPI)**: Dynamically control rendering resolution for dense engineering blueprints, tables, and fine-print PDFs.
* **200-Page Ingestion Engine**: Adaptive image chunk batching and token budgeting to rasterize and verbatim-transcribe documents up to 200 pages.
* **3 Hierarchical Chunking Tiers**:
  * 📄 **Large Tier (~3000 tokens)**: High-level overview & structural context.
  * 📝 **Medium Tier (~1200 tokens)**: Section policies & standard context.
  * 🔍 **Small Tier (~300 tokens)**: Granular rules, fee tables, and definitions.

---

### 🛡️ 6. Resilient Multi-Signal Evidence Gate & Cache Partitioning
* **Multi-Signal Grounding Evaluation**: Evaluates substantive text length ($\ge 40$ chars), semantic reranker coverage ($\ge 40\%$), exact entity/phrase matches, and vector score thresholds ($\ge 40$).
* **Signature-Aware Cache Partitioning**: Every cache key is bound to the active dataset signature (e.g. `qcache:a1_p1_w1:<hash>`), ensuring $0\text{ms}$ instantaneous cache invalidation when any dataset toggle or weight is modified.
* **Deep KV Cache Purging**: System settings modifications, file deletions, and chunk updates automatically trigger deep key purges across Cloudflare KV.

---

### 🎯 7. Interactive In-App Citation Routing & Golden Glow Animation
* **In-App Citation Navigation**: Clicking any citation chip in the Admin Chat widget navigates directly to the **AI Knowledge** page, flips to the correct pagination page, and scrolls the cited file into view.
* **Golden Glow Pulse Animation**: The cited document row is highlighted with a 4.5s golden glow pulse (`@keyframes highlightRowPulse`).
* **Web Link Direct Access**: Includes an inline `🔗` external link for direct browser visits to original web sources.
* **Refusal Citation Suppression**: Citations are cleanly suppressed on out-of-scope guardrail refusals.

---

## 🚀 Quick Start & Development Setup

### 1. Prerequisites
* **Node.js**: v18.0.0+ (v20+ recommended)
* **npm**: v9.0.0+
* **Wrangler**: `npm install -g wrangler`
* **Cloudflare API Token**: Token with `Account: D1:Edit, Workers KV Storage:Edit, Vectorize:Edit, Workers R2 Storage:Edit`.

### 2. Environment Configuration (`.dev.vars`)
Create a `.dev.vars` file in the root directory:
```ini
OPENAI_API_KEY=sk-proj-your-platform-master-openai-key
CF_PLATFORM_API_TOKEN=your-cloudflare-api-token
ADMIN_API_KEY=admin-secret-key-123
JWT_SECRET=super-secret-jwt-key-456
```

### 3. Database Migrations
Apply the initial migrations to your local D1 database:
```bash
npx wrangler d1 execute chatbot-db-dev --local --file=./migrations/0016_multi_tenant_schema.sql
npx wrangler d1 execute chatbot-db-dev --local --file=./migrations/0017_fallback_multi_tenant.sql
npx wrangler d1 execute chatbot-db-dev --local --file=./migrations/0018_per_tenant_resources.sql
npx wrangler d1 execute chatbot-db-dev --local --file=./migrations/0019_add_client_contact_email.sql
```

### 4. Run the Platform Locally
Open three terminal windows:

**Terminal 1 — Backend Worker API (Port 8787):**
```bash
npx wrangler dev --port 8787
```

**Terminal 2 — Scalable RAG Worker (Port 8788):**
```bash
cd scalable-rag
npx wrangler dev --port 8788
```

**Terminal 3 — Angular Admin Portal (Port 4200):**
```bash
cd chatbot-admin-v1
npm install
npm start
```

Access the Admin Portal at **`http://localhost:4200`**.  
Default Super Admin Login: **`admin`** / **`password123`**.
