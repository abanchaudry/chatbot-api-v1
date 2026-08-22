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
  directPageImages?: Array<{ pageNum: number; dataUrl: string }>,
): Promise<string> {
  // If standalone image, perform direct Vision OCR
  if (fileType === "image") {
    return extractImageVision(openai, data, filename, warnings);
  }

  const textBuffer = data.slice(0);
  const imageBuffer = data.slice(0);

  // Step 1: Base text extraction
  let baseText = await baseExtract(env, textBuffer, filename, fileType);

  // Step 2: Use client-rendered page images if provided, else extract embedded images
  let pageImages = directPageImages || [];
  const embeddedImages = pageImages.length === 0 ? await extractEmbeddedImagesAsync(imageBuffer, fileType) : [];

  const systemPrompt = [
    `You are an ultra-high precision document OCR and verbatim transcription engine.`,
    `CRITICAL MANDATE: Perform 100% EXHAUSTIVE VERBATIM CHARACTER-BY-CHARACTER TRANSCRIBING & OCR.`,
    `Transcribe EVERY visible word, letter, digit, symbol, navigation item, button label, dropdown arrow (˅), badge, quote, code snippet, and address EXACTLY as visually written in the image/document into clean GFM Markdown.`,
    "",
    "UNIVERSAL OCR & TRANSCRIPTION RULES (APPLIES TO ALL DOCUMENTS):",
    "1. ABSOLUTE VERBATIM INTEGRITY: Never hallucinate, guess, infer, truncate, or substitute ANY word, name, address, street number, phone number, email, URL, code, or identifier. If text is visible, transcribe the exact characters. Never replace unfamiliar or foreign words with training data.",
    "2. PROPER NOUNS & TESTIMONIALS: Transcribe all person names, usernames, designations, company names, review quotes, star ratings (★), and testimonial cards with 100% exact spelling and casing.",
    "3. ALPHANUMERIC IDENTIFIERS & ADDRESSES: Transcribe all street addresses, building numbers, suite/unit numbers, postal/ZIP codes, country labels, emails, phone numbers, and geospatial plus-codes (e.g. format `XXXX+XXX`) with 100% digit-for-digit precision. Treat alphanumeric strings as literal characters — never concatenate adjacent words or merge letters with numbers.",
    "4. HIGH-CONTRAST & STYLIZED TYPOGRAPHY DISAMBIGUATION: When reading text on dark/colored backgrounds or thin geometric fonts, carefully distinguish easily confused glyph pairs: 'S' vs '5', 'O' vs '0', 'I' vs 'l' vs '1', 'B' vs '8', 'D' vs 'R', 'n' vs 'ri'/'lr', 'H' vs 'M', '4' vs 'A'/'J'.",
    "5. UI ELEMENTS, NAVIGATION & CARDS: Transcribe all navigation headers, dropdown menus, button labels, category tags/chips, publication logos, case study card titles, and footer links verbatim.",
    "6. TABLES & CODE BLOCKS: Render all tabular data as clean, aligned GFM Markdown tables (| Col 1 | Col 2 |). Format all code snippets into clean fenced code blocks (```language).",
    "7. ANTI-SUMMARIZATION: Do NOT summarize, explain, paraphrase, or omit any content (e.g. NEVER write 'This slide covers...'). Extract the raw text and content directly.",
    "8. DOCUMENT IMAGES & AVATARS: If an image contains visual avatar pictures or graphic icons alongside text cards, focus exclusively on transcribing the printed text, quotes, and content verbatim without describing human faces.",
    "9. OUTPUT FORMAT: Output ONLY clean GFM Markdown without any conversational preamble or meta-commentary.",
  ].join("\n");

  // Case A: High-Resolution Visual Pages from Client Canvas
  if (pageImages.length > 0) {
    const batchSize = 1; // Process 1 page per batch in parallel for 100% exhaustive focus on every single page
    const batches: (typeof pageImages)[] = [];
    for (let i = 0; i < pageImages.length; i += batchSize) {
      batches.push(pageImages.slice(i, i + batchSize));
    }

    const batchPromises = batches.map(async (batch, batchIdx) => {
      const batchContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Document: ${filename}\n\n${baseText.trim().length > 50 ? `Digital Text Stream Reference for cross-anchoring:\n${baseText.slice(0, 30_000)}\n\n` : ""}Transcribe pages ${batch.map((p) => p.pageNum).join(", ")} with 100% EXHAUSTIVE VERBATIM OCR. Do NOT summarize or shorten:`,
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
          temperature: 0.0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: batchContent },
          ],
          max_tokens: 16384,
        });
        return { index: batchIdx, text: response.choices[0]?.message?.content ?? "" };
      } catch (err) {
        console.warn(`Vision OCR error on page batch ${batchIdx}:`, err);
        return { index: batchIdx, text: "" };
      }
    });

    const results = await Promise.all(batchPromises);
    const pageMarkdowns = results
      .sort((a, b) => a.index - b.index)
      .map((r) => r.text)
      .filter(Boolean);

    const combinedVisionText = pageMarkdowns.join("\n\n---\n\n").trim();
    if (combinedVisionText.length > 50 && baseText.trim().length > 50) {
      return `${combinedVisionText}\n\n---\n\n${baseText.trim()}`;
    } else if (combinedVisionText.length > 50) {
      return combinedVisionText;
    }
    return baseText;
  }

  // Case B: Embedded images
  if (embeddedImages.length > 0) {
    const batchSize = 2;
    const imgBatches: (typeof embeddedImages)[] = [];
    for (let i = 0; i < embeddedImages.length; i += batchSize) {
      imgBatches.push(embeddedImages.slice(i, i + batchSize));
    }

    const batchPromises = imgBatches.map(async (batch, batchIdx) => {
      const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Document: ${filename}\n\n${baseText.trim().length > 50 ? `Extracted Text Stream Reference:\n${baseText.slice(0, 30_000)}\n\n` : ""}Below are page/screenshot images extracted from the document:`,
        },
      ];

      for (let i = 0; i < batch.length; i++) {
        const img = batch[i];
        const b64 = uint8ToBase64(img.data);
        userContent.push({
          type: "text",
          text: `\n[Document Image #${batchIdx * batchSize + i + 1}]:`,
        });
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${img.mime};base64,${b64}`, detail: "high" },
        });
      }

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: 16384,
        });
        return { index: batchIdx, text: response.choices[0]?.message?.content ?? "" };
      } catch (err) {
        console.warn(`Vision OCR error on embedded image batch ${batchIdx}:`, err);
        return { index: batchIdx, text: "" };
      }
    });

    const results = await Promise.all(batchPromises);
    const visionMarkdowns = results
      .sort((a, b) => a.index - b.index)
      .map((r) => r.text)
      .filter((t) => 
        Boolean(t) &&
        !t.includes("unable to") &&
        !t.includes("cannot transcribe") &&
        !t.includes("cannot fulfill") &&
        !t.includes("I cannot assist") &&
        !t.includes("I'm unable")
      );

    const combinedVision = visionMarkdowns.join("\n\n---\n\n").trim();
    if (combinedVision.length > 50 && baseText.trim().length > 50) {
      return `${combinedVision}\n\n---\n\n${baseText.trim()}`;
    } else if (combinedVision.length > 50) {
      return combinedVision;
    }
  }

  // Case C: Digital text stream
  if (baseText.trim().length > 20) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document: ${filename}\n\nExtracted Text Stream:\n${baseText.slice(0, 100_000)}` },
      ],
      max_tokens: 16384,
    });
    return response.choices[0]?.message?.content ?? baseText;
  }

  return baseText;
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
  directPageImages?: Array<{ pageNum: number; dataUrl: string }>,
): Promise<string> {
  // If standalone image, perform direct Vision OCR
  if (fileType === "image") {
    return extractImageVision(openai, data, filename, warnings);
  }

  const textBuffer = data.slice(0);
  const imageBuffer = data.slice(0);

  const baseText = await baseExtract(env, textBuffer, filename, fileType);

  let pageImages: { pageNum: number; dataUrl: string }[] = directPageImages || [];
  if (pageImages.length === 0) {
    try {
      const pageImgObj = await env.DOCUMENTS.get(`uploads/${documentId}/page_images.json`);
      if (pageImgObj) pageImages = await pageImgObj.json();
    } catch {
      /* fallback */
    }
  }

  const embeddedImages = pageImages.length === 0 ? await extractEmbeddedImagesAsync(imageBuffer, fileType) : [];

  const systemPrompt = [
    `You are an ultra-high precision document OCR and verbatim transcription engine.`,
    `CRITICAL MANDATE: Perform 100% EXHAUSTIVE VERBATIM CHARACTER-BY-CHARACTER TRANSCRIBING & OCR.`,
    `Transcribe EVERY visible word, letter, digit, symbol, navigation item, button label, dropdown arrow (˅), badge, quote, code snippet, and address EXACTLY as visually written in the image/document into clean GFM Markdown.`,
    "",
    "UNIVERSAL OCR & TRANSCRIPTION RULES (APPLIES TO ALL DOCUMENTS):",
    "1. ABSOLUTE VERBATIM INTEGRITY: Never hallucinate, guess, infer, truncate, or substitute ANY word, name, address, street number, phone number, email, URL, code, or identifier. If text is visible, transcribe the exact characters. Never replace unfamiliar or foreign words with training data.",
    "2. PROPER NOUNS & TESTIMONIALS: Transcribe all person names, usernames, designations, company names, review quotes, star ratings (★), and testimonial cards with 100% exact spelling and casing.",
    "3. ALPHANUMERIC IDENTIFIERS & ADDRESSES: Transcribe all street addresses, building numbers, suite/unit numbers, postal/ZIP codes, country labels, emails, phone numbers, and geospatial plus-codes (e.g. format `XXXX+XXX`) with 100% digit-for-digit precision. Treat alphanumeric strings as literal characters — never concatenate adjacent words or merge letters with numbers.",
    "4. HIGH-CONTRAST & STYLIZED TYPOGRAPHY DISAMBIGUATION: When reading text on dark/colored backgrounds or thin geometric fonts, carefully distinguish easily confused glyph pairs: 'S' vs '5', 'O' vs '0', 'I' vs 'l' vs '1', 'B' vs '8', 'D' vs 'R', 'n' vs 'ri'/'lr', 'H' vs 'M', '4' vs 'A'/'J'.",
    "5. UI ELEMENTS, NAVIGATION & CARDS: Transcribe all navigation headers, dropdown menus, button labels, category tags/chips, publication logos, case study card titles, and footer links verbatim.",
    "6. TABLES & CODE BLOCKS: Render all tabular data as clean, aligned GFM Markdown tables (| Col 1 | Col 2 |). Format all code snippets into clean fenced code blocks (```language).",
    "7. ANTI-SUMMARIZATION: Do NOT summarize, explain, paraphrase, or omit any content (e.g. NEVER write 'This slide covers...'). Extract the raw text and content directly.",
    "8. DOCUMENT IMAGES & AVATARS: If an image contains visual avatar pictures or graphic icons alongside text cards, focus exclusively on transcribing the printed text, quotes, and content verbatim without describing human faces.",
    "9. OUTPUT FORMAT: Output ONLY clean GFM Markdown without any conversational preamble or meta-commentary.",
  ].join("\n");

  if (baseText.trim().length > 200 && pageImages.length === 0 && embeddedImages.length === 0) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document: ${filename}\n\nExtracted Text Stream:\n${baseText}` },
      ],
      max_tokens: 16384,
    });
    return response.choices[0]?.message?.content ?? baseText;
  }

  if (pageImages.length > 0) {
    const batchSize = 3;
    const batches: (typeof pageImages)[] = [];
    for (let i = 0; i < pageImages.length; i += batchSize) {
      batches.push(pageImages.slice(i, i + batchSize));
    }

    const batchPromises = batches.map(async (batch, batchIdx) => {
      const batchContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Document: ${filename}\n\n${baseText.trim().length > 50 ? `Digital Text Stream Reference for cross-anchoring:\n${baseText.slice(0, 30_000)}\n\n` : ""}Transcribe pages ${batch.map((p) => p.pageNum).join(", ")} with 100% EXHAUSTIVE VERBATIM OCR. Do NOT summarize or shorten:`,
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
          temperature: 0.0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: batchContent },
          ],
          max_tokens: 16384,
        });
        return { index: batchIdx, text: response.choices[0]?.message?.content ?? "" };
      } catch (err) {
        console.warn(`Vision OCR error on page batch ${batchIdx}:`, err);
        return { index: batchIdx, text: "" };
      }
    });

    const results = await Promise.all(batchPromises);
    const pageMarkdowns = results
      .sort((a, b) => a.index - b.index)
      .map((r) => r.text)
      .filter(Boolean);

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
    temperature: 0.0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 16384,
  });

  if (
    !result ||
    result.includes("unable to") ||
    result.includes("cannot transcribe") ||
    result.includes("cannot fulfill") ||
    result.includes("I cannot assist") ||
    result.includes("I'm unable")
  ) {
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
    temperature: 0.0,
    messages: [
      {
        role: "system",
        content: [
          "You are an ultra-high precision document OCR and verbatim transcription engine.",
          "CRITICAL MANDATE: Perform 100% EXHAUSTIVE VERBATIM CHARACTER-BY-CHARACTER TRANSCRIBING & OCR.",
          "Transcribe EVERY visible word, letter, digit, symbol, navigation item, button label, dropdown arrow (˅), badge, quote, code snippet, and address EXACTLY as visually written into clean GFM Markdown.",
          "",
          "UNIVERSAL OCR & TRANSCRIPTION RULES (APPLIES TO ALL DOCUMENTS):",
          "1. ABSOLUTE VERBATIM INTEGRITY: Never hallucinate, guess, infer, truncate, or substitute ANY word, name, address, street number, phone number, email, URL, code, or identifier. If text is visible, transcribe the exact characters. Never replace unfamiliar or foreign words with training data.",
          "2. PROPER NOUNS & TESTIMONIALS: Transcribe all person names, usernames, designations, company names, review quotes, star ratings (★), and testimonial cards with 100% exact spelling and casing.",
          "3. ALPHANUMERIC IDENTIFIERS & ADDRESSES: Transcribe all street addresses, building numbers, suite/unit numbers, postal/ZIP codes, country labels, emails, phone numbers, and geospatial plus-codes (e.g. format `XXXX+XXX`) with 100% digit-for-digit precision. Treat alphanumeric strings as literal characters — never concatenate adjacent words or merge letters with numbers.",
          "4. HIGH-CONTRAST & STYLIZED TYPOGRAPHY DISAMBIGUATION: When reading text on dark/colored backgrounds or thin geometric fonts, carefully distinguish easily confused glyph pairs: 'S' vs '5', 'O' vs '0', 'I' vs 'l' vs '1', 'B' vs '8', 'D' vs 'R', 'n' vs 'ri'/'lr', 'H' vs 'M', '4' vs 'A'/'J'.",
          "5. UI ELEMENTS, NAVIGATION & CARDS: Transcribe all navigation headers, dropdown menus, button labels, category tags/chips, publication logos, case study card titles, and footer links verbatim.",
          "6. TABLES & CODE BLOCKS: Render all tabular data as clean, aligned GFM Markdown tables (| Col 1 | Col 2 |). Format all code snippets into clean fenced code blocks (```language).",
          "7. ANTI-SUMMARIZATION: Do NOT summarize, explain, paraphrase, or omit any content (e.g. NEVER write 'This slide covers...'). Extract the raw text and content directly.",
          "8. DOCUMENT IMAGES & AVATARS: If an image contains visual avatar pictures or graphic icons alongside text cards, focus exclusively on transcribing the printed text, quotes, and content verbatim without describing human faces.",
          "9. OUTPUT FORMAT: Output ONLY clean GFM Markdown without any conversational preamble or meta-commentary.",
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

function adler32(buf: Uint8Array): number {
  let s1 = 1, s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

// Ultra-fast zero-compression (Store block) PNG encoder — runs in <2ms with zero CPU pressure
function rawToFastPng(width: number, height: number, rawData: Uint8Array, channels: number): Uint8Array {
  const rowSize = width * channels;
  const filteredLen = height * (1 + rowSize);
  const filtered = new Uint8Array(filteredLen);

  let srcIdx = 0, dstIdx = 0;
  for (let y = 0; y < height; y++) {
    filtered[dstIdx++] = 0; // Filter type 0 (None)
    filtered.set(rawData.subarray(srcIdx, srcIdx + rowSize), dstIdx);
    srcIdx += rowSize;
    dstIdx += rowSize;
  }

  const maxBlock = 65535;
  const numBlocks = Math.ceil(filteredLen / maxBlock);
  const zlibHeaderLen = 2;
  const zlibFooterLen = 4;
  const idatDataLen = zlibHeaderLen + numBlocks * 5 + filteredLen + zlibFooterLen;
  const idatPayload = new Uint8Array(idatDataLen);

  idatPayload[0] = 0x78; // Zlib header CMF
  idatPayload[1] = 0x01; // FLG

  let inPos = 0, outPos = 2;
  while (inPos < filteredLen) {
    const chunkLen = Math.min(filteredLen - inPos, maxBlock);
    const isLast = (inPos + chunkLen >= filteredLen) ? 1 : 0;
    idatPayload[outPos++] = isLast; // BFINAL + BTYPE=00 (Store)
    idatPayload[outPos++] = chunkLen & 0xff;
    idatPayload[outPos++] = (chunkLen >>> 8) & 0xff;
    const nlen = (~chunkLen) & 0xffff;
    idatPayload[outPos++] = nlen & 0xff;
    idatPayload[outPos++] = (nlen >>> 8) & 0xff;
    idatPayload.set(filtered.subarray(inPos, inPos + chunkLen), outPos);
    outPos += chunkLen;
    inPos += chunkLen;
  }

  const adler = adler32(filtered);
  idatPayload[outPos++] = (adler >>> 24) & 0xff;
  idatPayload[outPos++] = (adler >>> 16) & 0xff;
  idatPayload[outPos++] = (adler >>> 8) & 0xff;
  idatPayload[outPos++] = adler & 0xff;

  const totalPngLen = 8 + (12 + 13) + (12 + idatDataLen) + 12;
  const png = new Uint8Array(totalPngLen);
  let p = 0;

  // Signature
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], p); p += 8;

  // IHDR
  const colorType = channels === 4 ? 6 : (channels === 3 ? 2 : 0);
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = colorType;
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const ihdrChunk = new Uint8Array(4 + 13);
  ihdrChunk.set([0x49, 0x48, 0x44, 0x52], 0); // "IHDR"
  ihdrChunk.set(ihdrData, 4);

  const pngView = new DataView(png.buffer);
  pngView.setUint32(p, 13, false); p += 4;
  png.set(ihdrChunk, p); p += ihdrChunk.length;
  pngView.setUint32(p, crc32(ihdrChunk), false); p += 4;

  // IDAT
  const idatChunk = new Uint8Array(4 + idatDataLen);
  idatChunk.set([0x49, 0x44, 0x41, 0x54], 0); // "IDAT"
  idatChunk.set(idatPayload, 4);

  pngView.setUint32(p, idatDataLen, false); p += 4;
  png.set(idatChunk, p); p += idatChunk.length;
  pngView.setUint32(p, crc32(idatChunk), false); p += 4;

  // IEND
  const iendChunk = new Uint8Array([0x49, 0x45, 0x4e, 0x44]); // "IEND"
  pngView.setUint32(p, 0, false); p += 4;
  png.set(iendChunk, p); p += 4;
  pngView.setUint32(p, crc32(iendChunk), false); p += 4;

  return png;
}

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
