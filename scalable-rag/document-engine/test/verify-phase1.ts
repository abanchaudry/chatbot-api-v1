import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { processDocument, StructuredDocument } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase1Verification() {
  const fixturesDir = path.join(__dirname, "../test-fixtures");
  if (!fs.existsSync(fixturesDir)) {
    console.error("Test fixtures directory missing!");
    process.exit(1);
  }

  const files = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".pdf"))
    .sort();

  console.log(`\n==================================================`);
  console.log(` DOCLING ENGINE - PHASE 1 VERIFICATION`);
  console.log(`==================================================\n`);
  console.log(`Testing ${files.length} PDF fixtures against Docling + OCR Pipeline...\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const resultsTable: Array<{
    file: string;
    pages: number;
    doclingTime: string;
    ocrPages: number;
    totalBlocks: number;
    validationPassed: boolean;
    issues: string;
  }> = [];

  for (const file of files) {
    const filePath = path.join(fixturesDir, file);
    try {
      const doc: StructuredDocument = await processDocument(filePath, {
        maxDpi: 150,
      });

      const totalBlocks = doc.pages.reduce((sum, p) => sum + p.blocks.length, 0);
      const passed = doc.validationReport.passed && doc.validationReport.ruleIssues.length === 0;

      if (passed) {
        totalPassed++;
      } else {
        totalFailed++;
      }

      resultsTable.push({
        file,
        pages: doc.metadata.pageCount,
        doclingTime: `${doc.processingStats.doclingTimeMs}ms`,
        ocrPages: doc.processingStats.ocrPagesProcessed,
        totalBlocks,
        validationPassed: passed,
        issues: doc.validationReport.ruleIssues.join("; ") || "None",
      });
    } catch (err: any) {
      totalFailed++;
      resultsTable.push({
        file,
        pages: 0,
        doclingTime: "ERR",
        ocrPages: 0,
        totalBlocks: 0,
        validationPassed: false,
        issues: err.message || String(err),
      });
    }
  }

  console.table(
    resultsTable.map((r) => ({
      Fixture: r.file,
      Pages: r.pages,
      "Docling Time": r.doclingTime,
      "OCR Pages": r.ocrPages,
      "Blocks Extracted": r.totalBlocks,
      Validation: r.validationPassed ? "PASS ✅" : "FAIL ❌",
      Issues: r.issues,
    }))
  );

  console.log(`\n--------------------------------------------------`);
  console.log(`VERIFICATION SUMMARY:`);
  console.log(`Total Fixtures Tested : ${files.length}`);
  console.log(`Passed                : ${totalPassed} ✅`);
  console.log(`Failed                : ${totalFailed} ❌`);
  console.log(`--------------------------------------------------\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPhase1Verification().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
