# 🚀 Scalable RAG — Document Ingestion & 3-Tier Chunking Engine

An end-to-end, edge-native Document Ingestion, Categorization, and Hierarchical 3-Tier Chunking Engine built for high-scale Retrieval-Augmented Generation (RAG) applications.

Built on top of **Cloudflare Workers**, **Cloudflare R2**, **Cloudflare D1 Database**, **Cloudflare Vectorize**, and **OpenAI (`gpt-4o-mini`)**.

---

## 🔑 Key Features

- 📄 **Multi-Format Extraction Pipeline**: Ingests PDF, DOCX, PPTX, XLSX, CSV, PNG, JPG, and TXT files.
- ⚙️ **3 Extraction Engine Modes**:
  1. **⚡ Free Edge Pipeline** — Fast structural extraction with 0 LLM cost.
  2. **👁️ Hybrid AI Pipeline** — Text extraction combined with screenshot vision analysis for figures and diagrams.
  3. **🎯 100% AI Vision Pipeline** — High-accuracy 300 DPI full-page vision OCR.
- 🌳 **Hierarchical 3-Tier Chunking Engine**:
  - **Tier 1 (Large ~1k tokens)**: Document overview and full section summaries.
  - **Tier 2 (Medium ~400 tokens)**: Paragraph-level context blocks.
  - **Tier 3 (Small ~150 tokens)**: Leaf proposition chunks enriched with **Contextual Prefixes** for high retrieval accuracy.
- 🤖 **Adaptive vs 100% AI Semantic Chunking**:
  - **⚡ Adaptive Rule Tree**: Rule-based structural partitioning based on document taxonomy.
  - **🤖 100% AI Agentic LLM Chunker**: Agentic boundary detection & contextual prefix generation via `gpt-4o-mini`.
- ⚡ **Cloudflare Vectorize Indexing**: Automatically embeds leaf chunks with `text-embedding-3-small` (1536d) and syncs vector IDs to Cloudflare Vectorize.
- 🎨 **Dual UI Modes**:
  - **Technical Developer Mode**: Real-time table view, inline markdown editor, 3-dots action popovers, chunk keyword search inspector, and AI classifier audit logs.
  - **Simplified Admin Mode**: One-click upload wizard with live 4-stage horizontal connected visual stepper feedback and read-only chunk inspection.

---

## 🛠️ How to Integrate Ingestion into Other Projects

You can consume this ingestion engine as a standalone microservice via REST API endpoints or directly hook into the Cloudflare Worker.

### 1. Upload & Ingest a Document
```bash
POST /api/documents/upload
Content-Type: multipart/form-data

Form Data:
- file: <binary file>
- engineMode: "offline" | "hybrid" | "ai-full"
```
**Response**:
```json
{
  "documentId": "140e79fd-eeb9-4a60-8912-e5501d96d70b",
  "status": "processing",
  "filename": "annual_report.pdf"
}
```

### 2. Generate 3-Tier Chunks
```bash
POST /api/documents/:id/chunk
Content-Type: application/json

Body:
{
  "strategy": "ai"   // "adaptive" or "ai"
}
```
**Response**:
```json
{
  "message": "Chunks created successfully",
  "chunkCounts": {
    "total": 24,
    "large": 2,
    "medium": 6,
    "small": 16
  }
}
```

### 3. Embed & Index Leaf Chunks into Cloudflare Vectorize
```bash
POST /api/documents/:id/index
```
**Response**:
```json
{
  "message": "Indexed 16 leaf chunks into Vectorize index",
  "indexedCount": 16
}
```

### 4. Perform Vector RAG Search
```bash
POST /api/vector/search
Content-Type: application/json

Body:
{
  "query": "What are the account security policies?",
  "topK": 5
}
```
**Response**:
```json
{
  "query": "What are the account security policies?",
  "results": [
    {
      "id": "chunk_small_123",
      "score": 0.892,
      "metadata": {
        "document_id": "140e79fd-eeb9-4a60-8912-e5501d96d70b",
        "tier": "small",
        "chunk_index": 4,
        "content": "[Context: Security Policy / Section 2] Multi-Factor Authentication (MFA) is mandatory for all admin accounts."
      }
    }
  ]
}
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+)
- npm
- Cloudflare Wrangler CLI

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Configure environment secrets in .dev.vars
echo "OPENAI_API_KEY=your_openai_api_key" > .dev.vars

# 3. Start local development server on port 8787
npx wrangler dev --port 8787
```

Access the UI at: `http://127.0.0.1:8787`

---

## 📂 Project Structure

```
├── frontend/             # Single-page web application (HTML, CSS, JS)
├── src/
│   ├── chunking/         # Adaptive 3-Tier Tree & AI Semantic LLM Chunker
│   ├── extraction/       # Ingestion & document extraction handlers
│   ├── queue/            # Cloudflare Queue background consumer
│   ├── routes/           # REST API Endpoints (documents, vector search)
│   ├── vector/           # Cloudflare Vectorize embedding & indexing
│   └── index.ts          # Main Cloudflare Worker entry point
├── document-engine/      # Internal document parsing dependencies
├── schema.sql            # Cloudflare D1 Database SQL schema
└── wrangler.jsonc        # Cloudflare Workers configuration
```

---

## 📄 License
MIT License
