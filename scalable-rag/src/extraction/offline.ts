import mammoth from "mammoth";
import { unzipSync } from "fflate";
import { extractText } from "unpdf";
import type { Env, DocumentType, ExtractionResult } from "../types.js";

/**
 * Offline extraction pipeline — zero LLM cost.
 *
 * Uses native edge-compatible parsers:
 * - DOCX: mammoth (native JS Word document parser)
 * - PPTX / XLSX: fflate XML unzipping + text node extraction
 * - CSV: native delimiter detection and markdown table formatting
 * - Text / Code: UTF-8 decoding
 * - PDF: Workers AI `toMarkdown()` with graceful fallback
 */
export async function extractOffline(
  env: Env,
  data: ArrayBuffer,
  filename: string,
  fileType: DocumentType,
  documentId: string,
): Promise<ExtractionResult> {
  const start = Date.now();
  const warnings: string[] = [];
  let markdown = "";
  let pageCount = 1;

  switch (fileType) {
    case "docx": {
      try {
        markdown = await parseDocx(data);
        if (!markdown.trim()) {
          warnings.push("DOCX file yielded empty text.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`DOCX extraction error: ${msg}`);
        // Fallback to toMarkdown
        const res = await extractWithToMarkdown(env, data, filename);
        markdown = res.markdown;
        warnings.push(...res.warnings);
      }
      pageCount = estimatePageCount(markdown, fileType);
      break;
    }

    case "pptx": {
      try {
        markdown = parsePptx(data);
        if (!markdown.trim()) {
          const res = await extractWithToMarkdown(env, data, filename);
          markdown = res.markdown;
          warnings.push(...res.warnings);
        }
      } catch {
        const res = await extractWithToMarkdown(env, data, filename);
        markdown = res.markdown;
        warnings.push(...res.warnings);
      }
      pageCount = estimatePageCount(markdown, fileType);
      break;
    }

    case "xlsx": {
      try {
        markdown = parseXlsx(data);
        if (!markdown.trim()) {
          const res = await extractWithToMarkdown(env, data, filename);
          markdown = res.markdown;
          warnings.push(...res.warnings);
        }
      } catch {
        const res = await extractWithToMarkdown(env, data, filename);
        markdown = res.markdown;
        warnings.push(...res.warnings);
      }
      pageCount = estimatePageCount(markdown, fileType);
      break;
    }

    case "pdf": {
      try {
        const { text, totalPages } = await extractText(new Uint8Array(data.slice(0)));
        markdown = Array.isArray(text) ? text.join("\n\n") : String(text || "");
        pageCount = totalPages || 1;
        if (!markdown.trim()) {
          const res = await extractWithToMarkdown(env, data, filename);
          markdown = res.markdown;
          warnings.push(...res.warnings);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`PDF extraction error: ${msg}`);
        const res = await extractWithToMarkdown(env, data, filename);
        markdown = res.markdown;
        warnings.push(...res.warnings);
      }
      if (!markdown.trim()) {
        warnings.push("PDF text layer was empty or rasterized. Consider using AI Pipeline for OCR.");
      }
      break;
    }

    case "csv":
      markdown = parseCsv(data);
      break;

    case "text":
      markdown = decodeText(data);
      break;

    case "image": {
      try {
        markdown = await ocrImageWithWorkersAI(env, data);
        if (!markdown.trim()) {
          warnings.push("Cloudflare Workers AI OCR returned no text for this image.");
          markdown = `<!-- No text found in image: ${filename} -->`;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`Cloudflare Workers AI OCR error: ${msg}`);
        markdown = `<!-- OCR failed for image: ${filename} -->`;
      }
      break;
    }

    default:
      warnings.push(`No offline extractor for type "${fileType}".`);
      markdown = `<!-- Unsupported format: ${filename} -->`;
  }

  return {
    documentId,
    filename,
    fileType,
    engineMode: "offline",
    markdown: markdown.trim(),
    pageCount,
    processingTimeMs: Date.now() - start,
    warnings,
  };
}

// ─── Cloudflare Workers AI Vision OCR for Images ───────────────────

async function ocrImageWithWorkersAI(env: Env, data: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(data);
  const imageArray = Array.from(uint8);

  const prompt = "Extract all visible text from this image accurately. Output only the extracted text formatted in clean Markdown without explanation.";

  // Try LLaVA 1.5 Vision model on Workers AI (no extra license prompt required)
  try {
    const response = await (env.AI as any).run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: imageArray,
      prompt,
    });
    const result = response?.description || response?.response || response?.text || "";
    if (result.trim()) return result;
  } catch (e) {
    console.warn("[Workers AI] LLaVA OCR fallback:", e);
  }

  // Fallback: Try UForm Qwen model
  try {
    const response = await (env.AI as any).run("@cf/unum/uform-gen2-qwen-500m", {
      image: imageArray,
      prompt,
    });
    const result = response?.description || response?.response || response?.text || "";
    if (result.trim()) return result;
  } catch (e) {
    console.warn("[Workers AI] UForm OCR fallback:", e);
  }

  throw new Error("Cloudflare Workers AI OCR models were unable to process this image.");
}

// ─── Native DOCX extractor ──────────────────────────────────────────

async function parseDocx(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value ?? "";
}

// ─── Native PPTX XML extractor ──────────────────────────────────────

function parsePptx(data: ArrayBuffer): string {
  const unzipped = unzipSync(new Uint8Array(data));
  const slideFiles = Object.keys(unzipped)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ""), 10) || 0;
      return numA - numB;
    });

  if (slideFiles.length === 0) return "";

  const decoder = new TextDecoder();
  const slidesContent: string[] = [];

  slideFiles.forEach((slidePath, index) => {
    const xml = decoder.decode(unzipped[slidePath]);
    // Extract <a:t> text nodes
    const matches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
    const texts = matches
      .map((m) => m.replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 0);

    if (texts.length > 0) {
      slidesContent.push(`## Slide ${index + 1}\n\n${texts.join("\n\n")}`);
    }
  });

  return slidesContent.join("\n\n---\n\n");
}

// ─── Native XLSX XML extractor ──────────────────────────────────────

function parseXlsx(data: ArrayBuffer): string {
  const unzipped = unzipSync(new Uint8Array(data));
  const decoder = new TextDecoder();

  // Read shared strings lookup table if present
  let sharedStrings: string[] = [];
  if (unzipped["xl/sharedStrings.xml"]) {
    const ssXml = decoder.decode(unzipped["xl/sharedStrings.xml"]);
    const tMatches = ssXml.match(/<t[^>]*>(.*?)<\/t>/g) || [];
    sharedStrings = tMatches.map((m) => m.replace(/<[^>]+>/g, ""));
  }

  // Find worksheets
  const sheetFiles = Object.keys(unzipped)
    .filter((name) => name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml"))
    .sort();

  if (sheetFiles.length === 0) return "";

  const sheetsContent: string[] = [];

  sheetFiles.forEach((sheetPath, index) => {
    const xml = decoder.decode(unzipped[sheetPath]);
    const rowMatches = xml.match(/<row[^>]*>(.*?)<\/row>/g) || [];
    const rows: string[][] = [];

    rowMatches.forEach((rowXml) => {
      const cellMatches = rowXml.match(/<c[^>]*>(.*?)<\/c>/gi) || [];
      const rowValues: string[] = [];

      cellMatches.forEach((cXml) => {
        const isShared = cXml.includes('t="s"');
        const vMatch = cXml.match(/<v[^>]*>(.*?)<\/v>/);
        if (vMatch) {
          const val = vMatch[1];
          if (isShared && sharedStrings[parseInt(val, 10)]) {
            rowValues.push(sharedStrings[parseInt(val, 10)]);
          } else {
            rowValues.push(val);
          }
        }
      });

      if (rowValues.length > 0) rows.push(rowValues);
    });

    if (rows.length > 0) {
      const maxCols = Math.max(...rows.map((r) => r.length));
      const padded = rows.map((r) => {
        while (r.length < maxCols) r.push("");
        return r;
      });

      const header = padded[0];
      const tableMd = [
        `## Sheet ${index + 1}\n`,
        `| ${header.join(" | ")} |`,
        `| ${header.map(() => "---").join(" | ")} |`,
        ...padded.slice(1).map((r) => `| ${r.join(" | ")} |`),
      ].join("\n");

      sheetsContent.push(tableMd);
    }
  });

  return sheetsContent.join("\n\n---\n\n");
}

// ─── Workers AI toMarkdown ──────────────────────────────────────────

interface ToMarkdownResult {
  name: string;
  mimeType: string;
  data: string;
  tokens_used?: number;
}

async function extractWithToMarkdown(
  env: Env,
  data: ArrayBuffer,
  filename: string,
): Promise<{ markdown: string; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    const results: ToMarkdownResult[] = await (env.AI as any).toMarkdown([
      { name: filename, blob: new Blob([data]) },
    ]);

    if (results && results.length > 0 && results[0].data) {
      return { markdown: results[0].data, warnings };
    }

    warnings.push("AI toMarkdown returned empty result — file may be blank or unsupported.");
    return { markdown: "", warnings };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`AI toMarkdown error: ${msg}`);
    return { markdown: "", warnings };
  }
}

// ─── CSV parser ─────────────────────────────────────────────────────

function parseCsv(data: ArrayBuffer): string {
  const text = decodeText(data);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "";

  const firstLine = lines[0];
  const delimiters = ["\t", ";", "|", ","];
  let bestDelimiter = ",";
  let bestCount = 0;

  for (const d of delimiters) {
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = d;
    }
  }

  const rows = lines.map((line) =>
    line.split(bestDelimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")),
  );

  if (rows.length === 0) return "";

  const maxCols = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => {
    while (r.length < maxCols) r.push("");
    return r;
  });

  const header = padded[0];
  const divider = header.map(() => "---");
  const mdLines = [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...padded.slice(1).map((row) => `| ${row.join(" | ")} |`),
  ];

  return mdLines.join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────────

function decodeText(data: ArrayBuffer): string {
  return new TextDecoder().decode(data);
}

function estimatePageCount(markdown: string, fileType: DocumentType): number {
  if (!markdown) return 0;

  if (fileType === "pptx") {
    const slides = markdown.match(/^#{1,3}\s+slide/gim);
    if (slides) return slides.length;
  }

  if (fileType === "xlsx") {
    const sheets = markdown.match(/^#{1,3}\s+sheet/gim);
    if (sheets) return sheets.length;
  }

  return Math.max(1, Math.ceil(markdown.length / 3000));
}
