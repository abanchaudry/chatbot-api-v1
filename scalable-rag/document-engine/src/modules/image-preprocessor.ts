import { renderPdfPageToImageBuffer } from "../utils/rasterize.js";

export interface PreprocessedImage {
  pageNumber: number;
  imageBuffer: Buffer;
  mimeType: string;
  dataUrl: string;
}

export async function preprocessPageImage(
  pdfBuffer: Buffer,
  pageNumber: number,
  dpi: number = 200
): Promise<PreprocessedImage> {
  // Render page at high resolution for maximum OCR precision
  const imageBuffer = await renderPdfPageToImageBuffer(pdfBuffer, pageNumber, dpi);
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  return {
    pageNumber,
    imageBuffer,
    mimeType: "image/png",
    dataUrl,
  };
}
