import OpenAI from "openai";
import mammoth from "mammoth";
import { unzipSync, zlibSync } from "fflate";
import { extractText, getDocumentProxy, extractImages } from "unpdf";
import type { Env, DocumentType, EngineMode, ExtractionResult } from "../types.js";

/**
 * Enterprise Multimodal AI Extraction Engine
 *
 * Combines page-by-page Web Standard text extraction (`unpdf`, `mammoth`, `fflate`)
 * with PDF page image extraction, pure JS PNG conversion, GPT-4o Vision OCR,
 * strict GFM table formatting, and anti-hallucination constraints.
 */
export async function extractWithAI(
  env: Env,
  data: ArrayBuffer,
  filename: string,
  fileType: DocumentType,
  documentId: string,
  mode: EngineMode = "hybrid",
): Promise<ExtractionResult> {
  const start = Date.now();
  const warnings: string[] = [];

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  let markdown = "";

  try {
    if (fileType === "image") {
      markdown = await extractImageVision(openai, data, filename, warnings);
    } else if (fileType === "csv") {
      markdown = parseCsvDirect(data);
    } else if (fileType === "text") {
      markdown = new TextDecoder().decode(data);
    } else if (mode === "ai-full") {
      // 100% AI Vision Pipeline
      markdown = await extractDocumentFullVision(env, openai, data, filename, fileType, documentId, warnings);
    } else {
      // Hybrid Multimodal Pipeline (Text + Page Images -> GPT-4o Vision)
      markdown = await extractDocumentHybrid(env, openai, data, filename, fileType, warnings);
    }

    if (markdown.includes("<!-- unreadable") || markdown.includes("<!-- blurry")) {
      warnings.push("Document contains blurry or low-resolution unreadable sections.");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`AI extraction error: ${msg}`);

    if (!markdown) {
      try {
        const base = await baseExtract(env, data.slice(0), filename, fileType);
        markdown = base;
        warnings.push("Fell back to base extraction without AI refinement.");
      } catch {
        markdown = `<!-- Extraction failed for ${filename} -->`;
      }
    }
  }

  return {
    documentId,
    filename,
    fileType,
    engineMode: mode,
    markdown: markdown.trim(),
    pageCount: estimatePageCount(markdown, fileType),
    processingTimeMs: Date.now() - start,
    warnings,
  };
}

// ─── Multimodal Document Extraction ─────────────────────────────────

export async function extractDocumentHybrid(
  env: Env,
  openai: OpenAI,
  data: ArrayBuffer,
  filename: string,
  fileType: DocumentType,
  warnings: string[],
): Promise<string> {
  const textBuffer = data.slice(0);
  const imageBuffer = data.slice(0);

  // Step 1: Base text extraction
  let baseText = await baseExtract(env, textBuffer, filename, fileType);

  // Step 2: Extract embedded screenshot / page images
  const embeddedImages = await extractEmbeddedImagesAsync(imageBuffer, fileType);

  if (embeddedImages.length > 0) {
    warnings.push(`Detected ${embeddedImages.length} images/page streams in ${filename}. Performing Vision OCR.`);
  }

  // Case A: No images extracted
  if (embeddedImages.length === 0) {
    if (baseText.trim().length < 20) {
      return `<!-- Document ${filename} contains no readable text or image streams -->`;
    }

    // Refine text stream directly with GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: [
            `You are an industrial-grade document OCR and text transcription engine.`,
            `CRITICAL RULE: Perform 100% VERBATIM TEXT EXTRACTION. Do NOT summarize, paraphrase, describe, or rewrite any part of the document.`,
            `Transcribe every word, line, sentence, code snippet, and table EXACTLY as it appears in the document into clean GFM Markdown.`,
            "",
            "Rules:",
            "1. STRICT VERBATIM PRESERVATION: Output the exact source text word-for-word. Never write summaries or meta-descriptions (e.g. NEVER write 'This section provides an overview of...').",
            "2. Format code snippets into clean fenced code blocks (```html, ```css, etc.).",
            "3. Render all tabular data as neat GFM Markdown tables (| Col 1 | Col 2 |).",
            "4. Preserve all headers (#), bullet points, and original phrasing.",
            "5. Output ONLY clean GFM Markdown — no preamble or chatter.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Document: ${filename}\n\nExtracted Text Stream:\n${baseText.slice(0, 100_000)}`,
        },
      ],
      max_tokens: 16384,
    });

    return response.choices[0]?.message?.content ?? baseText;
  }

  // Case B: Multimodal Vision Payload (when images exist)
  const systemPrompt = [
    `You are an industrial-grade document OCR and text transcription engine.`,
    `CRITICAL RULE: Perform 100% VERBATIM TRANSCRIBING & OCR. Do NOT summarize, paraphrase, describe, or rewrite the document content.`,
    `Transcribe every word, header, line, code snippet, and table EXACTLY as written in the images/document into clean GFM Markdown.`,
    "",
    "DIRECTIVES:",
    "1. Perform high-fidelity OCR on each provided page/screenshot image. Transcribe all text, headers (#), bullet points, tables, code blocks, and slide text verbatim.",
    "2. MANDATORY TABLE FORMATTING RULE: Render all tabular data as neat, aligned GFM Markdown tables (| Col 1 | Col 2 |).",
    "3. MANDATORY CODE SCREENSHOT OCR RULE: If a slide contains a screenshot or picture of code (e.g. code snippets inside yellow, black, or gray boxes or output previews), you MUST perform OCR on the text INSIDE those screenshot images and transcribe all code into fenced code blocks (```html, ```css). Do NOT leave screenshot boxes un-transcribed!",
    "4. Format all code snippets into clean fenced code blocks (```html, ```css, etc.).",
    "5. ANTI-SUMMARIZATION RULE: Do NOT summarize, explain, or paraphrase (e.g. NEVER write 'This slide covers HTML tags...'). Extract and transcribe the raw text and code directly.",
    "6. Output ONLY clean GFM Markdown — no preamble or chatter.",
  ].join("\n");

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Document: ${filename}\n\n${baseText.trim().length > 50 ? `Extracted Text Stream Reference:\n${baseText.slice(0, 30_000)}\n\n` : ""}Below are page/screenshot images extracted from the document:`,
    },
  ];

  for (let i = 0; i < embeddedImages.length; i++) {
    const img = embeddedImages[i];
    const b64 = uint8ToBase64(img.data);
    userContent.push({
      type: "text",
      text: `\n[Document Image #${i + 1}]:`,
    });
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${b64}`, detail: "high" },
    });
  }


  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 16384,
  });

  const refined = response.choices[0]?.message?.content;

  if (!refined || refined.includes("unable to assist") || refined.includes("unable to transcribe")) {
    if (baseText.trim().length > 20) return baseText;
  }

  return refined ?? baseText;
}

// ─── 100% AI Vision Pipeline ─────────────────────────────────────────

export async function extractDocumentFullVision(
  env: Env,
  openai: OpenAI,
  data: ArrayBuffer,
  filename: string,
  fileType: DocumentType,
  documentId: string,
  warnings: string[],
): Promise<string> {
  const textBuffer = data.slice(0);
  const imageBuffer = data.slice(0);

  const baseText = await baseExtract(env, textBuffer, filename, fileType);

  let pageImages: { pageNum: number; dataUrl: string }[] = [];
  try {
    const pageImgObj = await env.DOCUMENTS.get(`uploads/${documentId}/page_images.json`);
    if (pageImgObj) pageImages = await pageImgObj.json();
  } catch {
    /* fallback */
  }

  const embeddedImages = await extractEmbeddedImagesAsync(imageBuffer, fileType);

  const systemPrompt = [
    `You are an industrial-grade document OCR and text transcription engine.`,
    `CRITICAL RULE: Perform 100% VERBATIM TRANSCRIBING & OCR. Do NOT summarize, paraphrase, describe, or rewrite the document content.`,
    `Transcribe every word, header, line, code snippet, and table EXACTLY as written in the images/document into clean GFM Markdown.`,
    "",
    "DIRECTIVES:",
    "1. Transcribe ALL text, headers (#), bullet points, slide content, code blocks, and tables verbatim.",
    "2. Format all code snippets into clean fenced code blocks (```html, ```css, etc.).",
    "3. Render all tables as neat, aligned GFM Markdown tables (| Col 1 | Col 2 |).",
    "4. MANDATORY CODE SCREENSHOT OCR RULE: If a slide contains a screenshot or picture of code (e.g. code snippets inside yellow, black, or gray boxes or output previews), you MUST perform OCR on the text INSIDE those screenshot images and transcribe all code into fenced code blocks (```html, ```css). Do NOT leave screenshot boxes un-transcribed!",
    "5. ANTI-SUMMARIZATION RULE: Do NOT summarize, explain, or paraphrase (e.g. NEVER write 'This section provides a detailed exploration of...'). Extract the raw text and code directly.",
    "6. Output ONLY clean Markdown — no intro chatter.",
  ].join("\n");


  if (baseText.trim().length > 200 && pageImages.length === 0 && embeddedImages.length === 0) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document: ${filename}\n\nExtracted Text Stream:\n${baseText}` },
      ],
      max_tokens: 16384,
    });
    return response.choices[0]?.message?.content ?? baseText;
  }

  if (pageImages.length > 0) {
    const pageMarkdowns: string[] = [];
    const batchSize = 2; // Process 2 pages per batch for maximum Vision OCR fidelity & full detail
    for (let i = 0; i < pageImages.length; i += batchSize) {
      const batch = pageImages.slice(i, i + batchSize);
      const batchContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Document: ${filename}\n\nTranscribe pages ${batch.map(p => p.pageNum).join(", ")} with 100% EXHAUSTIVE VERBATIM OCR. Do NOT summarize or shorten:`,
        },
      ];
      for (const pImg of batch) {
        batchContent.push({
          type: "text",
          text: `\n--- [PAGE #${pImg.pageNum} VISUAL CANVAS] ---`,
        });
        batchContent.push({
          type: "image_url",
          image_url: { url: pImg.dataUrl, detail: "high" },
        });
      }

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: batchContent },
          ],
          max_tokens: 16384,
        });
        const pageText = response.choices[0]?.message?.content ?? "";
        if (pageText) pageMarkdowns.push(pageText);
      } catch (err) {
        console.warn(`Vision OCR error on page batch starting at ${i}:`, err);
      }
    }

    if (pageMarkdowns.length > 0) {
      return pageMarkdowns.join("\n\n---\n\n");
    }
  }

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: `Document: ${filename}\n\nExtracted Text Stream Reference:\n${baseText.slice(0, 30_000)}\n\nBelow are document page visual streams:`,
    },
  ];

  if (embeddedImages.length > 0) {
    for (let i = 0; i < embeddedImages.length; i++) {
      const img = embeddedImages[i];

      const b64 = uint8ToBase64(img.data);
      userContent.push({
        type: "text",
        text: `\n[Page Image #${i + 1}]:`,
      });
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${b64}`, detail: "high" },
      });
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 16384,
  });

  const result = response.choices[0]?.message?.content;
  if (!result || result.includes("unable to assist") || result.includes("unable to transcribe")) {
    warnings.push("OpenAI Vision safety filter triggered — using digital text stream.");
    return baseText;
  }

  return result;
}

// ─── Image OCR via Vision (Standalone Images) ───────────────────────

async function extractImageVision(
  openai: OpenAI,
  data: ArrayBuffer,
  filename: string,
  warnings: string[],
): Promise<string> {
  const base64 = uint8ToBase64(new Uint8Array(data.slice(0)));
  const mime = inferImageMime(filename);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: [
          "You are an expert document OCR engine. Extract ALL text, code blocks, and tables from this image.",
          "",
          "Rules:",
          "1. Format all tabular data as clean GFM Markdown tables (| Col 1 | Col 2 |).",
          "2. Format code in fenced code blocks (```language).",
          "3. If text is blurry or unreadable, insert: <!-- unreadable: blurry image -->.",
          "4. Do NOT hallucinate content.",
          "5. Output ONLY clean Markdown.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Extract all content from ${filename}:` },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${base64}`, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 16384,
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─── Pure JS PNG Converter for Raw PDF Images ───────────────────────

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array, start = 0, end = buf.length): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function rawToPng(width: number, height: number, rawData: Uint8Array, channels: number): Uint8Array {
  let rgba = new Uint8Array(width * height * 4);
  if (channels === 4) {
    rgba = rawData;
  } else if (channels === 3) {
    for (let p = 0, q = 0; p < rawData.length; p += 3, q += 4) {
      rgba[q] = rawData[p];
      rgba[q + 1] = rawData[p + 1];
      rgba[q + 2] = rawData[p + 2];
      rgba[q + 3] = 255;
    }
  } else if (channels === 1) {
    for (let p = 0, q = 0; p < rawData.length; p++, q += 4) {
      rgba[q] = rawData[p];
      rgba[q + 1] = rawData[p];
      rgba[q + 2] = rawData[p];
      rgba[q + 3] = 255;
    }
  }

  const rowSize = width * 4;
  const rawWithFilter = new Uint8Array(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    rawWithFilter[y * (rowSize + 1)] = 0;
    const srcStart = y * rowSize;
    const dstStart = y * (rowSize + 1) + 1;
    rawWithFilter.set(rgba.subarray(srcStart, srcStart + rowSize), dstStart);
  }

  const idatCompressed = zlibSync(rawWithFilter);
  const pngSize = 8 + 25 + (12 + idatCompressed.length) + 12;
  const png = new Uint8Array(pngSize);
  let pos = 0;

  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], pos);
  pos += 8;

  const ihdrBuf = new Uint8Array(17);
  ihdrBuf.set([0x49, 0x48, 0x44, 0x52], 0);
  const viewIhdr = new DataView(ihdrBuf.buffer);
  viewIhdr.setUint32(4, width, false);
  viewIhdr.setUint32(8, height, false);
  ihdrBuf[12] = 8;
  ihdrBuf[13] = 6;
  ihdrBuf[14] = 0;
  ihdrBuf[15] = 0;
  ihdrBuf[16] = 0;

  const viewPng = new DataView(png.buffer);
  viewPng.setUint32(pos, 13, false); pos += 4;
  png.set(ihdrBuf, pos); pos += 17;
  viewPng.setUint32(pos, crc32(ihdrBuf), false); pos += 4;

  viewPng.setUint32(pos, idatCompressed.length, false); pos += 4;
  const idatTypeBuf = new Uint8Array(4 + idatCompressed.length);
  idatTypeBuf.set([0x49, 0x44, 0x41, 0x54], 0);
  idatTypeBuf.set(idatCompressed, 4);
  png.set(idatTypeBuf, pos); pos += idatTypeBuf.length;
  viewPng.setUint32(pos, crc32(idatTypeBuf), false); pos += 4;

  viewPng.setUint32(pos, 0, false); pos += 4;
  png.set([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82], pos);

  return png;
}

// ─── Multimodal Image Extractor ─────────────────────────────────────

interface ExtractedImage {
  mime: string;
  data: Uint8Array;
}

async function extractEmbeddedImagesAsync(data: ArrayBuffer, fileType: DocumentType): Promise<ExtractedImage[]> {
  if (fileType === "pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(data.slice(0)));
      const out: ExtractedImage[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
        const pageImgs = await extractImages(pdf, i);
        for (const img of pageImgs) {
          if (img.width > 100 && img.height > 100) {
            const pngBytes = rawToPng(img.width, img.height, img.data, img.channels);
            out.push({ mime: "image/png", data: pngBytes });
          }
        }
      }
      if (out.length > 0) return out;
    } catch {
      /* fallback */
    }
  }

  return extractEmbeddedImages(data);
}

function extractEmbeddedImages(pdfOrDocBuffer: ArrayBuffer): ExtractedImage[] {
  const bytes = new Uint8Array(pdfOrDocBuffer.slice(0));
  const images: ExtractedImage[] = [];

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const unzipped = unzipSync(bytes);
      Object.keys(unzipped).forEach((path) => {
        if (path.match(/\.(png|jpe?g|webp|bmp)$/i)) {
          const ext = path.split(".").pop()?.toLowerCase() ?? "png";
          const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
          const imgBytes = unzipped[path];
          if (imgBytes.length > 2500) {
            images.push({ mime, data: imgBytes });
          }
        }
      });
      if (images.length > 0) return images;
    } catch {
      /* fallback */
    }
  }

  let i = 0;
  while (i < bytes.length - 3 && images.length < 15) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      const start = i;
      let j = start + 3;
      while (j < bytes.length - 1) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const end = j + 2;
          const imgBytes = bytes.subarray(start, end);
          if (imgBytes.length > 2500) {
            images.push({ mime: "image/jpeg", data: imgBytes });
          }
          i = end;
          break;
        }
        j++;
      }
    }
    i++;
  }

  i = 0;
  while (i < bytes.length - 8 && images.length < 15) {
    if (
      bytes[i] === 0x89 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x4e &&
      bytes[i + 3] === 0x47
    ) {
      const start = i;
      let j = start + 8;
      while (j < bytes.length - 4) {
        if (
          bytes[j] === 0x49 &&
          bytes[j + 1] === 0x45 &&
          bytes[j + 2] === 0x4e &&
          bytes[j + 3] === 0x44
        ) {
          const end = j + 8;
          const imgBytes = bytes.subarray(start, end);
          if (imgBytes.length > 2500) {
            images.push({ mime: "image/png", data: imgBytes });
          }
          i = end;
          break;
        }
        j++;
      }
    }
    i++;
  }

  return images;
}

// ─── Page-Demarcated Base Extraction ────────────────────────────────

async function baseExtract(
  env: Env,
  data: ArrayBuffer,
  filename: string,
  fileType: DocumentType,
): Promise<string> {
  if (fileType === "pdf") {
    try {
      const { text, totalPages } = await extractText(new Uint8Array(data.slice(0)));
      if (Array.isArray(text)) {
        const pages = text
          .map((pageText, idx) => {
            const trimmed = pageText.trim();
            return trimmed ? `--- Page ${idx + 1} of ${totalPages} ---\n${trimmed}` : "";
          })
          .filter(Boolean);
        return pages.join("\n\n");
      }
      return String(text || "");
    } catch {
      /* fallback */
    }
  }

  if (fileType === "docx") {
    try {
      const res = await mammoth.extractRawText({ arrayBuffer: data.slice(0) });
      if (res.value?.trim()) return res.value;
    } catch {
      /* fallback */
    }
  }

  if (fileType === "pptx" || fileType === "xlsx") {
    try {
      const unzipped = unzipSync(new Uint8Array(data.slice(0)));
      const decoder = new TextDecoder();
      const parts: string[] = [];

      Object.keys(unzipped).forEach((key, idx) => {
        if (key.endsWith(".xml")) {
          const xml = decoder.decode(unzipped[key]);
          const textMatches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>|<t[^>]*>(.*?)<\/t>/g) || [];
          const texts = textMatches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean);
          if (texts.length > 0) {
            parts.push(`--- Slide/Sheet ${idx + 1} ---\n${texts.join("\n")}`);
          }
        }
      });
      if (parts.length > 0) return parts.join("\n\n");
    } catch {
      /* fallback */
    }
  }

  try {
    const results = await (env.AI as any).toMarkdown([
      { name: filename, blob: new Blob([data.slice(0)]) },
    ]);
    return results?.[0]?.data ?? "";
  } catch {
    return "";
  }
}

// ─── CSV Direct ─────────────────────────────────────────────────────

function parseCsvDirect(data: ArrayBuffer): string {
  const text = new TextDecoder().decode(data.slice(0));
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return "";

  const delimiters = ["\t", ";", "|", ","];
  let best = ",";
  let bestN = 0;
  for (const d of delimiters) {
    const n = lines[0].split(d).length;
    if (n > bestN) { bestN = n; best = d; }
  }

  const rows = lines.map((l) => l.split(best).map((c) => c.trim().replace(/^"|"$/g, "")));
  const maxCols = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => { while (r.length < maxCols) r.push(""); return r; });

  const hdr = padded[0];
  return [
    `| ${hdr.join(" | ")} |`,
    `| ${hdr.map(() => "---").join(" | ")} |`,
    ...padded.slice(1).map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function inferImageMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };
  return map[ext] ?? "image/png";
}

function estimatePageCount(markdown: string, fileType: DocumentType): number {
  if (!markdown) return 0;
  if (fileType === "pptx") {
    const m = markdown.match(/^#{1,3}\s+slide/gim);
    return m ? m.length : 1;
  }
  return Math.max(1, Math.ceil(markdown.length / 3000));
}
