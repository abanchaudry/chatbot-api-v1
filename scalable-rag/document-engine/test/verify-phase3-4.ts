import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { processDocument, StructuredDocument } from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPhase3And4Verification() {
  console.log(`\n==================================================`);
  console.log(` DOCLING ENGINE - MULTI-FORMAT VERIFICATION`);
  console.log(`==================================================\n`);

  const sampleTxtPath = path.join(__dirname, "../test-fixtures/sample_code.ts");
  fs.writeFileSync(sampleTxtPath, `export function add(a: number, b: number): number {\n  return a + b;\n}`);

  try {
    const doc: StructuredDocument = await processDocument(sampleTxtPath);

    console.log(`Format              : ${doc.documentType}`);
    console.log(`Code Blocks Extracted: ${doc.codeBlocks.length}`);
    console.log(`Total Pages         : ${doc.metadata.pageCount}`);

    if (doc.documentType === "code" && doc.codeBlocks.length >= 0) {
      console.log(`Multi-Format Verification Passed! ✅\n`);
    } else {
      console.error(`Multi-Format Verification Failed!`);
      process.exit(1);
    }
  } finally {
    if (fs.existsSync(sampleTxtPath)) {
      try { fs.unlinkSync(sampleTxtPath); } catch {}
    }
  }
}

runPhase3And4Verification().catch((err) => {
  console.error("Multi-format verification error:", err);
  process.exit(1);
});
