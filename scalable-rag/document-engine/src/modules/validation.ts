import { PageBlock, ValidationReport } from "../types.js";

export function performRuleValidation(
  pages: PageBlock[],
  expectedPageCount: number,
  retryAttempted: boolean = false
): ValidationReport {
  const issues: string[] = [];

  if (!pages || pages.length === 0) {
    issues.push("Empty extraction: No pages were produced.");
  } else {
    if (pages.length !== expectedPageCount && expectedPageCount > 0) {
      issues.push(`Page count mismatch: Expected ${expectedPageCount} pages, but produced ${pages.length}.`);
    }

    const seenPageNums = new Set<number>();
    const seenParagraphs = new Set<string>();

    pages.forEach((page, pIdx) => {
      const pageNum = page.pageNumber;
      if (seenPageNums.has(pageNum)) {
        issues.push(`Duplicate page detected: Page ${pageNum}.`);
      }
      seenPageNums.add(pageNum);

      if (pageNum !== pIdx + 1) {
        issues.push(`Page order discrepancy: Expected page number ${pIdx + 1}, found ${pageNum}.`);
      }

      page.blocks.forEach((block, bIdx) => {
        const textContent = typeof block.content === "string" ? block.content : JSON.stringify(block.content);

        if (textContent.trim().length === 0) {
          issues.push(`Page ${pageNum} Block ${bIdx}: Empty content block.`);
        }

        // Check for OCR failures
        if (textContent.includes("[OCR Error")) {
          issues.push(`Page ${pageNum} Block ${bIdx}: OCR processing failed.`);
        }

        // Check for duplicate paragraphs
        if (block.type === "paragraph" && textContent.length > 50) {
          if (seenParagraphs.has(textContent)) {
            issues.push(`Duplicate paragraph detected on Page ${pageNum}: "${textContent.slice(0, 40)}..."`);
          }
          seenParagraphs.add(textContent);
        }
      });
    });
  }

  return {
    passed: issues.length === 0,
    ruleValidationRan: true,
    ruleIssues: issues,
    retryAttempted,
    aiValidationRan: false,
  };
}
