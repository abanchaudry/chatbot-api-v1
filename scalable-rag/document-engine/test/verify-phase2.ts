import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { processDocument, StructuredDocument } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase2Verification() {
  const samplePdf = path.join(__dirname, "../test-fixtures/01_clean_report.pdf");
  if (!fs.existsSync(samplePdf)) {
    console.log("Phase 2 test: sample PDF fixture not found.");
    return;
  }

  console.log(`\n==================================================`);
  console.log(` DOCUMENT INTELLIGENCE ENGINE - PHASE 2 (OPTION 2 FULL AI) VERIFICATION`);
  console.log(`==================================================\n`);

  const doc: StructuredDocument = await processDocument(samplePdf, {
    engineMode: "ai",
  });

  console.log(`Document ID         : ${doc.documentId}`);
  console.log(`Engine Mode         : ${doc.processingStats.engineMode}`);
  console.log(`Pages Processed     : ${doc.pages.length}`);
  console.log(`Blocks Extracted    : ${doc.pages.reduce((acc, p) => acc + p.blocks.length, 0)}`);
  console.log(`Rule Validation     : ${doc.validationReport.passed ? "PASSED ✅" : "FAILED ❌"}\n`);

  if (!doc.documentId || doc.processingStats.engineMode !== "ai") {
    console.error("Phase 2 Failure: Option 2 AI engine failed to run!");
    process.exit(1);
  }

  console.log(`Phase 2 Option 2 Full AI Engine Verification Passed! ✅\n`);
}

runPhase2Verification().catch((err) => {
  console.error("Phase 2 verification error:", err);
  process.exit(1);
});
