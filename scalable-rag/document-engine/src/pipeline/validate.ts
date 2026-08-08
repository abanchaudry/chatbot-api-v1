import { StructuredDocument, ContentBlock } from "../types.js";

export interface ValidationResult {
  passed: boolean;
  ruleBasedIssues: string[];
  llmValidationRan: boolean;
  llmValidationNotes?: string;
}

export function validateStructuredDocument(doc: StructuredDocument): ValidationResult {
  const issues: string[] = [];

  if (!doc.documentId) {
    issues.push("Missing documentId");
  }

  const validSourceTypes = new Set(["pdf", "docx", "pptx", "xlsx", "image", "code", "unknown"]);
  if (!validSourceTypes.has(doc.documentType)) {
    issues.push(`Invalid documentType: '${doc.documentType}'`);
  }

  if (!Array.isArray(doc.pages)) {
    issues.push("Pages must be an array");
  } else {
    if (doc.pages.length !== doc.metadata.pageCount) {
      issues.push(
        `Page count mismatch: metadata specifies ${doc.metadata.pageCount}, but pages array contains ${doc.pages.length}`
      );
    }

    doc.pages.forEach((page, idx) => {
      const expectedPageNum = idx + 1;
      if (page.pageNumber !== expectedPageNum) {
        issues.push(
          `Page ordering issue: expected page number ${expectedPageNum}, found ${page.pageNumber}`
        );
      }

      if (!Array.isArray(page.blocks)) {
        issues.push(`Page ${page.pageNumber} blocks must be an array`);
        return;
      }

      page.blocks.forEach((block, bIdx) => {
        const blockIssues = validateBlock(block, page.pageNumber, bIdx);
        issues.push(...blockIssues);
      });
    });
  }

  return {
    passed: issues.length === 0,
    ruleBasedIssues: issues,
    llmValidationRan: doc.validationReport?.aiValidationRan || false,
  };
}

function validateBlock(block: ContentBlock, pageNum: number, blockIdx: number): string[] {
  const issues: string[] = [];
  const validTypes = new Set([
    "paragraph",
    "heading",
    "table",
    "figure",
    "chart",
    "equation",
    "code",
    "list",
  ]);

  if (!validTypes.has(block.type)) {
    issues.push(`Page ${pageNum} Block ${blockIdx}: invalid type '${block.type}'`);
  }

  if (block.content === undefined || block.content === null) {
    issues.push(`Page ${pageNum} Block ${blockIdx}: missing content`);
  } else if (typeof block.content === "string" && block.content.trim().length === 0) {
    issues.push(`Page ${pageNum} Block ${blockIdx}: unexpectedly empty text content`);
  }

  if (block.sourceMethod !== "docling" && block.sourceMethod !== "ocr" && block.sourceMethod !== "native") {
    issues.push(
      `Page ${pageNum} Block ${blockIdx}: invalid sourceMethod '${block.sourceMethod}'`
    );
  }

  if (
    typeof block.confidence !== "number" ||
    isNaN(block.confidence) ||
    block.confidence < 0 ||
    block.confidence > 1
  ) {
    issues.push(
      `Page ${pageNum} Block ${blockIdx}: confidence out of range [0, 1] (${block.confidence})`
    );
  }

  if (block.boundingBox) {
    if (!Array.isArray(block.boundingBox) || block.boundingBox.length !== 4) {
      issues.push(
        `Page ${pageNum} Block ${blockIdx}: boundingBox must be 4 numbers [ymin, xmin, ymax, xmax]`
      );
    } else {
      const [ymin, xmin, ymax, xmax] = block.boundingBox;
      if (ymin > ymax || xmin > xmax) {
        issues.push(
          `Page ${pageNum} Block ${blockIdx}: invalid boundingBox coordinates [${ymin}, ${xmin}, ${ymax}, ${xmax}]`
        );
      }
    }
  }

  return issues;
}
