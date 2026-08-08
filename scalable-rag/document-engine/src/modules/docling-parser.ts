import * as path from "path";
import {
  ContentBlock,
  PageBlock,
  OutlineItem,
  SectionItem,
  ParagraphItem,
  TableItem,
  FigureItem,
  CodeBlockItem,
  EquationItem,
} from "../types.js";
import { getPdfPageCount } from "../utils/rasterize.js";
import { extractNativePdfPage } from "../pipeline/extractors/native-pdf.js";
import { extractDocx } from "../pipeline/extractors/docx.js";
import { extractPptx } from "../pipeline/extractors/pptx.js";
import { extractXlsx } from "../pipeline/extractors/xlsx.js";
import { extractCsv } from "../pipeline/extractors/csv.js";
import { extractCodeOrText } from "../pipeline/extractors/code.js";

export interface DoclingParseResult {
  success: boolean;
  markdown: string;
  pages: PageBlock[];
  outline: OutlineItem[];
  sections: SectionItem[];
  paragraphs: ParagraphItem[];
  tables: TableItem[];
  figures: FigureItem[];
  codeBlocks: CodeBlockItem[];
  equations: EquationItem[];
  missingVisualPageNumbers: number[];
  processingTimeMs: number;
}

/**
 * 100% Native JavaScript Structure & Layout Parser
 * Zero Python dependencies required.
 */
export async function parseWithDocling(
  buffer: Buffer,
  filename: string
): Promise<DoclingParseResult> {
  const startTime = Date.now();
  const result = await parseNativeDocumentPages(buffer, filename, startTime);
  return result;
}

async function parseNativeDocumentPages(
  buffer: Buffer,
  filename: string,
  startTime: number
): Promise<DoclingParseResult> {
  const ext = path.extname(filename).toLowerCase();
  const isPdf = ext === ".pdf" || buffer.slice(0, 4).toString("binary") === "%PDF";
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"].includes(ext) ||
                  buffer.slice(0, 8).toString("hex").startsWith("89504e47") ||
                  buffer.slice(0, 4).toString("hex").startsWith("ffd8ffe0") ||
                  buffer.slice(0, 4).toString("hex").startsWith("ffd8ffe1");

  const processingTimeMs = Date.now() - startTime;

  if (isImage) {
    return assembleNativeParseResult(
      [{ pageNumber: 1, blocks: [] }],
      processingTimeMs,
      [1]
    );
  } else if (ext === ".docx") {
    const docxPages = await extractDocx(buffer);
    return assembleNativeParseResult(docxPages, processingTimeMs);
  } else if (ext === ".pptx") {
    const pptxPages = await extractPptx(buffer);
    return assembleNativeParseResult(pptxPages, processingTimeMs);
  } else if (ext === ".xlsx" || ext === ".xls") {
    const xlsxPages = await extractXlsx(buffer);
    return assembleNativeParseResult(xlsxPages, processingTimeMs);
  } else if (ext === ".csv" || ext === ".tsv") {
    const csvPages = await extractCsv(buffer);
    return assembleNativeParseResult(csvPages, processingTimeMs);
  } else if (!isPdf) {
    const txtPages = await extractCodeOrText(buffer);
    return assembleNativeParseResult(txtPages, processingTimeMs);
  }

  // Native PDF extraction via PDF.js layout engine
  const pages: PageBlock[] = [];
  const missingVisualPageNumbers: number[] = [];

  let pageCount = 1;
  try {
    pageCount = await getPdfPageCount(buffer);
  } catch {}

  for (let pNum = 1; pNum <= pageCount; pNum++) {
    let blocks: ContentBlock[] = [];
    try {
      blocks = await extractNativePdfPage(buffer, pNum);
    } catch (err) {
      console.warn(`Failed native extraction for PDF page ${pNum}:`, err);
    }

    pages.push({ pageNumber: pNum, blocks });

    const pageTextLength = blocks.reduce((sum, b) => sum + (typeof b.content === "string" ? b.content.length : 0), 0);
    if (pageTextLength < 30) {
      missingVisualPageNumbers.push(pNum);
    }
  }

  return assembleNativeParseResult(pages, processingTimeMs, missingVisualPageNumbers);
}

function assembleNativeParseResult(
  pages: PageBlock[],
  processingTimeMs: number,
  missingVisualPageNumbers: number[] = []
): DoclingParseResult {
  const outline: OutlineItem[] = [];
  const paragraphs: ParagraphItem[] = [];
  const tables: TableItem[] = [];
  const codeBlocks: CodeBlockItem[] = [];
  const markdownParts: string[] = [];

  pages.forEach((p) => {
    markdownParts.push(`<!-- Page ${p.pageNumber} -->`);
    p.blocks.forEach((block) => {
      const textContent = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
      markdownParts.push(textContent);

      if (block.type === "heading") {
        outline.push({ title: textContent, level: 1, pageNumber: p.pageNumber });
      } else if (block.type === "paragraph") {
        paragraphs.push({ id: block.id, text: textContent, pageNumber: p.pageNumber });
      } else if (block.type === "table") {
        tables.push({ id: block.id, markdown: textContent, rows: [], pageNumber: p.pageNumber, source: "docling" });
      } else if (block.type === "code") {
        codeBlocks.push({ id: block.id, code: textContent, pageNumber: p.pageNumber });
      }
    });
  });

  return {
    success: true,
    markdown: markdownParts.join("\n\n"),
    pages,
    outline,
    sections: [],
    paragraphs,
    tables,
    figures: [],
    codeBlocks,
    equations: [],
    missingVisualPageNumbers,
    processingTimeMs,
  };
}
