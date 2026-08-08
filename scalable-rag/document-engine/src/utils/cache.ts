import * as crypto from "crypto";
import { ContentBlock } from "../types.js";

const pageCache = new Map<string, ContentBlock[]>();

/**
 * Computes deterministic SHA256 content hash for a page buffer.
 */
export function computePageHash(pdfBuffer: Buffer, pageNumber: number): string {
  const hash = crypto.createHash("sha256");
  hash.update(pdfBuffer);
  hash.update(`page_${pageNumber}`);
  return hash.digest("hex");
}

export function getCachedPageBlocks(pdfBuffer: Buffer, pageNumber: number): ContentBlock[] | undefined {
  const key = computePageHash(pdfBuffer, pageNumber);
  return pageCache.get(key);
}

export function setCachedPageBlocks(pdfBuffer: Buffer, pageNumber: number, blocks: ContentBlock[]): void {
  const key = computePageHash(pdfBuffer, pageNumber);
  pageCache.set(key, blocks);
}

export function clearPageCache(): void {
  pageCache.clear();
}
