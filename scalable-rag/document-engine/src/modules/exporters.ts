import { StructuredDocument } from "../types.js";

export function exportToMarkdown(doc: StructuredDocument): string {
  const parts: string[] = [];

  parts.push(`# ${doc.metadata.originalFilename.replace(/\.[^/.]+$/, "")}\n`);

  if (doc.documentOutline.length > 0) {
    parts.push("## Table of Contents");
    doc.documentOutline.forEach((item) => {
      const indent = "  ".repeat(Math.max(0, item.level - 1));
      parts.push(`${indent}- ${item.title} (Page ${item.pageNumber})`);
    });
    parts.push("");
  }

  doc.pages.forEach((page) => {
    parts.push(`<!-- Page ${page.pageNumber} -->\n`);
    page.blocks.forEach((block) => {
      if (block.type === "heading") {
        parts.push(`### ${block.content}\n`);
      } else if (block.type === "code") {
        parts.push("```");
        parts.push(String(block.content));
        parts.push("```\n");
      } else if (block.type === "table") {
        if (typeof block.content === "string") {
          parts.push(block.content + "\n");
        } else if (typeof block.content === "object" && (block.content as any).rows) {
          const rows = (block.content as any).rows as string[][];
          rows.forEach((r, idx) => {
            parts.push(`| ${r.join(" | ")} |`);
            if (idx === 0) {
              parts.push(`| ${r.map(() => "---").join(" | ")} |`);
            }
          });
          parts.push("");
        }
      } else {
        parts.push(String(block.content) + "\n");
      }
    });
  });

  return parts.join("\n");
}

export function exportToValidationReport(doc: StructuredDocument): string {
  const lines: string[] = [];
  lines.push("==================================================");
  lines.push(" DOCUMENT INTELLIGENCE ENGINE VALIDATION REPORT");
  lines.push("==================================================");
  lines.push(`Document ID       : ${doc.documentId}`);
  lines.push(`Filename          : ${doc.metadata.originalFilename}`);
  lines.push(`Document Type     : ${doc.documentType}`);
  lines.push(`Page Count        : ${doc.metadata.pageCount}`);
  lines.push(`Processed At      : ${doc.metadata.processedAt}`);
  lines.push(`Rule Validation   : ${doc.validationReport.passed ? "PASSED ✅" : "ISSUES FOUND ❌"}`);
  lines.push(`Retry Attempted   : ${doc.validationReport.retryAttempted ? "YES" : "NO"}`);
  lines.push(`AI Validation Ran : ${doc.validationReport.aiValidationRan ? "YES" : "NO"}`);
  if (doc.validationReport.aiConfidenceScore !== undefined) {
    lines.push(`AI Confidence Score: ${doc.validationReport.aiConfidenceScore}%`);
  }
  lines.push("");

  lines.push("--------------------------------------------------");
  lines.push("RULE-BASED VALIDATION ISSUES:");
  if (doc.validationReport.ruleIssues.length === 0) {
    lines.push("No rule issues detected.");
  } else {
    doc.validationReport.ruleIssues.forEach((issue, idx) => {
      lines.push(` ${idx + 1}. ${issue}`);
    });
  }
  lines.push("");

  if (doc.validationReport.aiValidationRan) {
    lines.push("--------------------------------------------------");
    lines.push("AI VALIDATION DISCREPANCIES & WARNINGS:");
    if (doc.validationReport.aiWarnings && doc.validationReport.aiWarnings.length > 0) {
      doc.validationReport.aiWarnings.forEach((w, idx) => {
        lines.push(` ${idx + 1}. ${w}`);
      });
    } else {
      lines.push("No AI discrepancies flagged.");
    }
    lines.push("");

    lines.push("AI SUGGESTED CORRECTIONS:");
    if (doc.validationReport.aiSuggestedCorrections && doc.validationReport.aiSuggestedCorrections.length > 0) {
      doc.validationReport.aiSuggestedCorrections.forEach((c, idx) => {
        lines.push(` ${idx + 1}. ${c}`);
      });
    } else {
      lines.push("None.");
    }
    lines.push("");
  }

  lines.push("--------------------------------------------------");
  lines.push("PROCESSING STATISTICS:");
  lines.push(`Docling Processing Time  : ${doc.processingStats.doclingTimeMs} ms`);
  lines.push(`OCR Pages Processed      : ${doc.processingStats.ocrPagesProcessed}`);
  lines.push(`OCR Processing Time      : ${doc.processingStats.ocrTimeMs} ms`);
  lines.push(`Total Processing Time    : ${doc.processingStats.totalProcessingTimeMs} ms`);
  lines.push("==================================================");

  return lines.join("\n");
}
