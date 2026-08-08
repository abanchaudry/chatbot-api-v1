# Document Intelligence Engine 🚀

> **Standalone Document Intelligence, Layout Parsing & Vision OCR Engine for Node.js & TypeScript.**  
> 100% Native JavaScript/TypeScript implementation with Zero Python dependencies.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📌 Overview

**`doc-intel-engine`** is a standalone, lightweight document intelligence library designed to be imported into any Node.js, Express, Next.js, or TypeScript application.

It supports dual execution pipelines for extracting structured text, headings, tables, code blocks, lists, and layout order from multi-format documents:

1. **Option 1: Pure Offline Engine (`engineMode: "offline"`)**: 100% local layout extraction using PDF.js, Mammoth OpenXML, ADM-Zip, and local Wasm Tesseract.js OCR. **Zero LLM or API cost.**
2. **Option 2: Full AI Vision Engine (`engineMode: "ai"`)**: Hybrid 5-Stage Set-of-Marks (SoM) visual badge tagging at 300 DPI + Kahn's Topological Spatial DAG Sorter + OpenAI `gpt-4o` Structured Outputs (`PageDOM`).

---

## 📁 Supported File Formats

- **PDF Documents** (`.pdf`) — Scanned, native, or hybrid multipage PDFs.
- **Word Documents** (`.docx`, `.doc`) — Headings, tables, lists, code blocks, inline formatting.
- **PowerPoint Presentations** (`.pptx`, `.ppt`) — Slide layouts, text frames, table grids.
- **Excel & CSV Spreadsheets** (`.xlsx`, `.xls`, `.csv`, `.tsv`) — Aligned Markdown tables.
- **Standalone Images** (`.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`) — Automatic OCR routing.
- **Source Code & Text** (`.py`, `.ts`, `.js`, `.json`, `.md`, `.txt`) — Plain text extraction.

---

## 🛠️ Installation & Basic Usage

### Installation
```bash
npm install doc-intel-engine
```

### Basic Example (Node.js / TypeScript)

```typescript
import { processDocument, exportToMarkdown } from "doc-intel-engine";
import * as fs from "fs";

async function main() {
  const fileBuffer = fs.readFileSync("./sample_presentation.pdf");

  // 1. Execute Option 1 (Pure Offline Engine - Zero API Cost)
  const result = await processDocument(fileBuffer, {
    engineMode: "offline",
    originalFilename: "sample_presentation.pdf",
  });

  console.log(`Extracted ${result.pages.length} pages and ${result.tables.length} tables.`);

  // 2. Export to Clean Markdown
  const markdown = exportToMarkdown(result);
  fs.writeFileSync("./output.md", markdown);
}

main();
```

### Option 2 (Full AI Vision Pipeline)

```typescript
const result = await processDocument(fileBuffer, {
  engineMode: "ai",
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  maxDpi: 300,
});
```

---

## 🔑 Public API Reference

The library exposes the following primary functions from `doc-intel-engine`:

- **`processDocument(input: string | Buffer, options?: ProcessOptions): Promise<StructuredDocument>`**  
  Core execution engine that parses input buffers or file paths under Option 1 or Option 2.
- **`exportToMarkdown(doc: StructuredDocument): string`**  
  Normalizes extracted structured document output into GitHub Flavored Markdown.
- **`exportToValidationReport(doc: StructuredDocument): string`**  
  Generates an automated rule-based document integrity audit report.
- **`detectAndValidateFile(buffer: Buffer, filename: string): FileValidationResult`**  
  Detects file format via MIME types and binary magic bytes.

---

## 🏗️ Folder Structure

```text
doc-intel-engine/
├── src/                       <-- Core Standalone Library Source
│   ├── index.ts               <-- Public API Entry Point
│   ├── types.ts               <-- TypeScript Declarations & Schemas
│   ├── modules/               <-- Pipeline Modules (SoM Tagger, DAG Sorter, Vision, OCR)
│   ├── pipeline/              <-- Format Extractors (PDF, DOCX, XLSX, PPTX, CSV, Code)
│   └── utils/                 <-- Utilities (rasterize, logger, cache)
├── dist/                      <-- Compiled JS & Type Declarations (outDir)
│   ├── index.js
│   └── index.d.ts
├── test-fixtures/             <-- Document Verification Fixtures
├── test/                      <-- Automated Test Suite
├── tsconfig.lib.json          <-- Library Compilation Config
└── package.json               <-- Package Manifest
```

---

## 🧪 Testing

To run the automated integration test suite across all 17 test PDF fixtures and multi-format files:

```bash
npm test
```

To build the compiled library bundle (`dist/index.js` and `dist/index.d.ts`):

```bash
npm run build
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.
