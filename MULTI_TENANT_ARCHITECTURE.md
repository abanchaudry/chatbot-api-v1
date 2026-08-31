# 🏢 Multi-Tenant SaaS Architecture & Production Deployment Guide

> **Target Branch:** `multitenant-version`  
> **Platform Version:** Enterprise Multi-Tenant SaaS v2.0  
> **Target Audience:** Core Developers, DevOps Engineers, and Infrastructure Architects.

---

## 1. High-Level System Architecture

The platform is designed as an edge-native, multi-tenant SaaS architecture where each registered business receives **its own dedicated set of Cloudflare resources** (D1 SQLite database, KV cache namespace, 4 Vectorize indexes, and R2 storage bucket) created automatically under the platform's Cloudflare account.

Clients are fully insulated from all Cloudflare complexity — they only provide their business info, select their AI billing preference, and access their workspace.

```mermaid
flowchart TD
    subgraph Client Layer
        A1["Public Chat Widget with x-client-token"] --> API
        A2["Tenant Admin Portal - localhost:4200"] --> API
        A3["Super Admin Control Plane (5-Step Wizard)"] --> API
    end

    subgraph Edge API Worker (Cloudflare Worker + Hono)
        API["Hono Router & Auth Middleware"]
        API --> TC["Tenant Context Resolver (tenant.service.ts)"]
        TC --> SEC["AES-GCM 256-bit Key Decryptor"]
        TC --> CP_DB[("Control Plane D1: clients, client_resources, auth")]
    end

    subgraph Dedicated Per-Tenant Cloudflare Infrastructure
        TC -->|SQL Queries| D1_REST["Dynamic D1 REST Client: chatbot-{slug}-db"]
        TC -->|L1 Exact Cache| KV_REST["Dynamic KV REST Client: chatbot-{slug}-cache"]
        TC -->|Vector Similarity Searches| VEC_REST["Vectorize v2 REST Client: 4 Indexes (admin, pdf, web, qcache)"]
        TC -->|Object File Storage| R2_REST["Cloudflare R2 Bucket: chatbot-{slug}-storage"]
    end

    subgraph AI Intelligence & Billing Layer
        TC -->|Mode: Platform Managed| O1["Platform Master OpenAI Account"]
        TC -->|Mode: BYOK (Custom Key)| O2["Tenant Private OpenAI Key (sk-proj-...)"]
    end

    subgraph Scalable RAG Microservice
        API -->|Vision OCR & 3-Tier Chunker| SR["Scalable RAG Worker (:8788)"]
    end
```

---

## 2. Multi-Tenant Infrastructure Isolation Strategy

Every tenant operates on physically isolated resources at the Cloudflare edge:

### A. Dedicated D1 SQLite Database (`chatbot-{slug}-db`)
* Each business has an independent D1 SQLite database UUID stored in `client_resources.d1_database_id`.
* The database is automatically initialized during provisioning with the complete schema:
  * `files` (Uploaded PDFs, crawled documents)
  * `chunks` & `chunks_fts` (Full-text FTS5 search index with triggers)
  * `threads` & `messages` (Private conversation histories)
  * `message_traces` (Step-by-step developer debug traces)
  * `system_settings` (Assistant persona, domain hint, and dataset weights)
  * `fallback_queries` & `fallback_clusters` (Unanswered query intelligence)
  * `logs`, `ingest_jobs`, `ingest_events`, `upload_progress`
  * `document_chunks` & `document_chunks_fts`

### B. Dedicated KV Fast Cache Namespace (`chatbot-{slug}-cache`)
* Fast sub-millisecond edge cache namespace dedicated strictly to that business.
* Stores signature-partitioned query responses (`qcache:a1_p1_w1:<hash>`) and preflight hashes.
* Modifying settings or deleting files triggers instant, scoped key purges without affecting other tenants.

### C. 4 Dedicated Vectorize Indexes (1536-dim Cosine)
1. **`chatbot-{slug}-admin`**: Curated administrative documents & executive policies (Weight: 1.25x).
2. **`chatbot-{slug}-pdf`**: Technical engineering manuals, legal regulations, and datasheets (Weight: 1.10x).
3. **`chatbot-{slug}-web`**: Crawled website documentation and FAQ pages (Weight: 1.00x).
4. **`chatbot-{slug}-qcache`**: L2 semantic similarity query cache ($\ge 95\%$ cosine threshold).

### D. Dedicated R2 Storage Vault (`chatbot-{slug}-storage`)
* Encrypted S3-compatible Cloudflare R2 bucket for raw PDF/document uploads and asset preservation.

---

## 3. Dual-Mode Runtime Routing Architecture

The backend implements dynamic routing via `src/v1/services/tenant.service.ts`:

```
                                  [ Incoming Request ]
                                           │
                           Resolve client_id & client_resources
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
          Has Dedicated Resources?                       No Dedicated Resources?
             (Production Mode)                             (Local Dev / Fallback)
                    │                                             │
      Use D1RestClient for Tenant DB                Use Shared Worker Native Binding
      Use KVRestClient for Tenant Cache             Enforce `WHERE client_id = ?` SQL filter
      Use Vectorize REST for Tenant Indexes         Enforce `namespace = client_id` in Vectorize
```

1. **Production Dedicated Mode (Mode B)**:
   * When `client_resources.d1_database_id` and `kv_namespace_id` exist, `tenantService` instantiates lightweight REST clients (`createD1RestClient`, `createKVRestClient`, `cloudflareVectorizeRestService`).
   * Operations execute directly against the tenant's isolated Cloudflare infrastructure.
2. **Local / Fallback Mode (Mode A)**:
   * If running locally in `wrangler dev` without Cloudflare credentials, the server falls back to shared local bindings (`c.env.DB`, `c.env.KV`, `c.env.VECTORIZE_*`) with strict metadata and column scoping (`WHERE client_id = ?`).

---

## 4. AI Intelligence & Billing Modes

Organizations choose how their AI generation and embedding costs are billed:

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│            Platform Managed AI               │        Bring Your Own Key (BYOK)             │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ • Uses platform master OpenAI key            │ • Client provides their own OpenAI API key   │
│ • Pooled capacity included with plan         │ • Token usage billed directly to client's    │
│ • Zero API key setup required by client      │   OpenAI account                             │
│ • Super Admin can set quotas and limits      │ • AES-GCM 256-bit encrypted at rest          │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Self-Service Key Updates & Super Admin Approval Flow:
1. **Switch to BYOK (Instant)**: Clients can enter their OpenAI API key on the **Business Persona** page (`/dashboard/assistant-information`) to switch to BYOK immediately.
2. **Switch to Platform Billing (Approval Required)**: To prevent unauthorized platform cost overruns, BYOK clients clicking **"Request switch to Platform Billing"** submit a review request to the `api_key_requests` table.
3. **Super Admin Approval**: Super Admin reviews pending requests in the dashboard with 1-click **Approve** (which switches `billing_mode` to `platform` and removes the private key) or **Reject**.

---

## 5. Security & Key Encryption (AES-GCM 256-bit)

Tenant API keys are never stored in plaintext:
1. A unique 12-byte Initialization Vector (`IV`) is generated for each secret via Web Crypto API `crypto.getRandomValues(new Uint8Array(12))`.
2. Encrypted using **AES-GCM (256-bit)** derived from `JWT_SECRET` / master platform key.
3. Stored as Base64 in `client_secrets` table (`openai_api_key_encrypted`, `openai_api_key_iv`).
4. Decrypted exclusively in-memory inside the V8 Worker execution context during model calls.

---

## 6. Roles & Access Control

| Role | Permissions | Access Path |
| :--- | :--- | :--- |
| **`super_admin`** | Access all businesses, run 5-Step Registration Wizard, inspect dedicated resources, approve/reject key switch requests, view global metrics. | `/dashboard/super-admin/*` |
| **`client_admin`** | Scoped strictly to their own business workspace: manage documents, crawl websites, view threads/traces, adjust persona, update OpenAI key. Blocked from super admin pages. | `/dashboard/*` (Tenant Workspace) |

---

## 7. Production Deployment Guide

### A. Environment Secrets
Set your Cloudflare production secrets via Wrangler:
```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CF_PLATFORM_API_TOKEN
npx wrangler secret put ADMIN_API_KEY
npx wrangler secret put JWT_SECRET
```

### B. Deploying Migrations to Remote D1
```bash
npx wrangler d1 execute chatbot-db-prod --remote --file=./migrations/0016_multi_tenant_schema.sql
npx wrangler d1 execute chatbot-db-prod --remote --file=./migrations/0017_fallback_multi_tenant.sql
npx wrangler d1 execute chatbot-db-prod --remote --file=./migrations/0018_per_tenant_resources.sql
npx wrangler d1 execute chatbot-db-prod --remote --file=./migrations/0019_add_client_contact_email.sql
```

### C. Deploying Workers
```bash
# 1. Deploy Scalable RAG Microservice
cd scalable-rag
npx wrangler deploy

# 2. Deploy Backend API Worker
cd ..
npx wrangler deploy
```

### D. Deploying Angular Admin Portal (Cloudflare Pages)
```bash
cd chatbot-admin-v1
npm run build --configuration=production
npx wrangler pages deploy dist/chatbot-admin-v1 --project-name=chatbot-admin
```
