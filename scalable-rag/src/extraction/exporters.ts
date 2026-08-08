import type { ExtractionResult } from "../types.js";

/**
 * Converts an ExtractionResult into a standalone markdown document
 * with a metadata header.
 *
 * Adapted from document-engine/src/modules/exporters.ts — pure string
 * operations, fully compatible with Cloudflare Workers.
 */
export function exportToMarkdown(result: ExtractionResult): string {
  const lines: string[] = [];

  // Metadata header
  lines.push("---");
  lines.push(`document_id: ${result.documentId}`);
  lines.push(`filename: ${result.filename}`);
  lines.push(`file_type: ${result.fileType}`);
  lines.push(`engine_mode: ${result.engineMode}`);
  lines.push(`page_count: ${result.pageCount}`);
  lines.push(`processing_time_ms: ${result.processingTimeMs}`);
  if (result.warnings.length > 0) {
    lines.push(`warnings:`);
    for (const w of result.warnings) {
      lines.push(`  - "${w}"`);
    }
  }
  lines.push("---");
  lines.push("");

  // Main content
  lines.push(result.markdown);

  return lines.join("\n");
}

/**
 * Returns a short plain-text summary suitable for display in the admin UI.
 */
export function exportSummary(result: ExtractionResult): string {
  const charCount = result.markdown.length;
  const wordCount = result.markdown.split(/\s+/).filter(Boolean).length;
  const lineCount = result.markdown.split("\n").length;

  return [
    `File: ${result.filename}`,
    `Type: ${result.fileType.toUpperCase()} | Mode: ${result.engineMode}`,
    `Pages: ${result.pageCount} | Words: ${wordCount.toLocaleString()} | Characters: ${charCount.toLocaleString()} | Lines: ${lineCount.toLocaleString()}`,
    `Processing: ${result.processingTimeMs}ms`,
    result.warnings.length > 0
      ? `Warnings: ${result.warnings.join("; ")}`
      : "No warnings",
  ].join("\n");
}
