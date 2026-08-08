import express from "express";
import cors from "cors";
import multer from "multer";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { processDocument } from "../src/index.js";
import { renderPdfPageToImageBuffer, getPdfPageCount } from "../src/utils/rasterize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFullServerIntegration() {
  console.log("\n==================================================");
  console.log(" TESTING EXPRESS API SERVER & FULL INTEGRATION");
  console.log("==================================================\n");

  const app = express();
  app.use(cors());
  app.use(express.json());

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  app.post("/api/process", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file" });

      const doc = await processDocument(req.file.buffer, { maxDpi: 150 });
      const pageImages: string[] = [];

      if (doc.sourceType === "pdf") {
        const pageCount = await getPdfPageCount(req.file.buffer);
        for (let i = 1; i <= pageCount; i++) {
          const imgBuf = await renderPdfPageToImageBuffer(req.file.buffer, i, 150);
          pageImages.push(`data:image/png;base64,${imgBuf.toString("base64")}`);
        }
      }

      res.json({ document: doc, pageImages });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const server = app.listen(3099, async () => {
    console.log("Test Express Server running on port 3099");

    const pdfPath = path.join(__dirname, "../test-fixtures/01_clean_report.pdf");
    const pdfBuffer = fs.readFileSync(pdfPath);

    const boundary = "--------------------------" + Date.now().toString(16);
    const postData = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="01_clean_report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
      ),
      pdfBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const req = http.request(
      {
        hostname: "localhost",
        port: 3099,
        path: "/api/process",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": postData.length,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          console.log(`HTTP Response Status Code : ${res.statusCode}`);
          if (res.statusCode === 200) {
            const parsed = JSON.parse(body);
            console.log(`- Document ID Received   : ${parsed.document.documentId}`);
            console.log(`- Source Type            : ${parsed.document.sourceType}`);
            console.log(`- Total Pages            : ${parsed.document.metadata.pageCount}`);
            console.log(`- Extracted Blocks       : ${parsed.document.pages[0].blocks.length}`);
            console.log(`- Rendered Page Previews : ${parsed.pageImages.length}`);
            console.log("\nEXPRESS SERVER API INTEGRATION PASSED ✅\n");
          } else {
            console.error("API SERVER TEST FAILED:", body);
          }
          server.close();
          process.exit(0);
        });
      }
    );

    req.on("error", (err) => {
      console.error("Request Error:", err);
      server.close();
      process.exit(1);
    });

    req.write(postData);
    req.end();
  });
}

testFullServerIntegration().catch((err) => {
  console.error(err);
  process.exit(1);
});
