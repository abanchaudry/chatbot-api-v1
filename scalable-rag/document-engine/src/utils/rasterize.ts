import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "module";
import { pathToFileURL } from "url";

try {
  const localRequire = createRequire(import.meta.url);
  const workerPath = localRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
} catch {}

export async function renderPdfPageToImageBuffer(
  pdfBuffer: Buffer,
  pageNumber: number, // 1-based
  dpi: number = 150
): Promise<Buffer> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });

  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(pageNumber);

  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const context = canvas.getContext("2d");

  const renderContext = {
    canvasContext: context as any,
    viewport: viewport,
  };

  await page.render(renderContext).promise;
  return canvas.toBuffer("image/png");
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0,
  });
  const pdfDocument = await loadingTask.promise;
  return pdfDocument.numPages;
}
