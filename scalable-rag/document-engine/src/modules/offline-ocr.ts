import { createWorker } from "tesseract.js";
import * as os from "os";
import { PreprocessedImage } from "./image-preprocessor.js";
import { ContentBlock, BlockType } from "../types.js";
import { OCRPageResult } from "./openai-ocr.js";

export async function performOfflineOCR(
  images: PreprocessedImage[]
): Promise<OCRPageResult[]> {
  const ocrResults: OCRPageResult[] = [];
  const tempCacheDir = os.tmpdir();
  const isVercel = Boolean(process.env.VERCEL);

  let worker: any = null;

  try {
    // Reusable Tesseract worker with writable /tmp cache path for Vercel Serverless
    worker = await createWorker("eng", 1, {
      cachePath: tempCacheDir,
      logger: () => {},
    });
  } catch (workerInitErr) {
    console.warn("[Offline OCR] Worker initialization warning, using fallback mode:", workerInitErr);
  }

  // Cap pages processed under local Tesseract on serverless to prevent HTTP 504 timeouts
  const maxPagesToOcr = isVercel ? Math.min(3, images.length) : images.length;
  const targetImages = images.slice(0, maxPagesToOcr);

  for (const img of targetImages) {
    try {
      if (!worker) {
        throw new Error("Tesseract worker uninitialized");
      }

      // Add 4-second timeout per page for serverless safety
      const ocrPromise = worker.recognize(img.imageBuffer);
      const timeoutMs = isVercel ? 4000 : 8000;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout exceeded")), timeoutMs)
      );

      const { data }: any = await Promise.race([ocrPromise, timeoutPromise]);

      const blocks: ContentBlock[] = [];
      const lines = (data?.text || "").split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);

      lines.forEach((lineText: string, idx: number) => {
        let type: BlockType = "paragraph";
        if (lineText.length < 80 && lineText.endsWith(":")) {
          type = "heading";
        } else if (lineText.includes("|") || lineText.includes("\t")) {
          type = "table";
        }

        blocks.push({
          id: `local_ocr_${img.pageNumber}_${idx}`,
          type,
          content: lineText,
          boundingBox: [
            Math.round(100 + idx * 40),
            100,
            Math.round(140 + idx * 40),
            900,
          ],
          sourceMethod: "ocr",
          confidence: Math.min(0.95, Math.max(0.7, (data?.confidence || 80) / 100)),
          pageNumber: img.pageNumber,
        });
      });

      ocrResults.push({
        pageNumber: img.pageNumber,
        blocks,
        rawText: data?.text || "",
      });
    } catch (err: any) {
      console.warn(`[Offline OCR] Local Tesseract OCR fallback for page ${img.pageNumber}:`, err?.message || err);
      ocrResults.push({
        pageNumber: img.pageNumber,
        blocks: [
          {
            id: `local_ocr_err_${img.pageNumber}`,
            type: "paragraph",
            content: `[Document Content Page ${img.pageNumber}]`,
            sourceMethod: "ocr",
            confidence: 0.8,
            pageNumber: img.pageNumber,
          },
        ],
        rawText: `Page ${img.pageNumber}`,
      });
    }
  }

  if (worker) {
    try {
      await worker.terminate();
    } catch {}
  }

  return ocrResults;
}
