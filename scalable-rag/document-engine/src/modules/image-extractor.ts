import { preprocessPageImage, PreprocessedImage } from "./image-preprocessor.js";
import { DocumentType } from "../types.js";

export async function extractVisualContentPages(
  documentBuffer: Buffer,
  documentType: DocumentType,
  missingPageNumbers: number[],
  dpi: number = 200
): Promise<PreprocessedImage[]> {
  const results: PreprocessedImage[] = [];

  if (documentType === "pdf") {
    for (const pageNum of missingPageNumbers) {
      try {
        const prep = await preprocessPageImage(documentBuffer, pageNum, dpi);
        results.push(prep);
      } catch (err) {
        console.warn(`Failed to extract image for page ${pageNum}:`, err);
      }
    }
  } else if (documentType === "image") {
    const base64 = documentBuffer.toString("base64");
    results.push({
      pageNumber: 1,
      imageBuffer: documentBuffer,
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${base64}`,
    });
  }

  return results;
}
