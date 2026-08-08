import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

async function generateFixtures() {
  const outputDir = path.join(__dirname, "../test-fixtures");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Clean Report PDF
  const doc1 = await PDFDocument.create();
  const font1 = await doc1.embedFont(StandardFonts.Helvetica);
  const fontBold1 = await doc1.embedFont(StandardFonts.HelveticaBold);
  const p1 = doc1.addPage([612, 792]);
  p1.drawText("Quarterly Financial Report 2026", { x: 50, y: 720, size: 24, font: fontBold1 });
  p1.drawText("Executive Summary", { x: 50, y: 670, size: 16, font: fontBold1 });
  p1.drawText("The company demonstrated outstanding performance across all primary operational sectors.", { x: 50, y: 640, size: 12, font: font1 });
  p1.drawText("Key Accomplishments:", { x: 50, y: 600, size: 14, font: fontBold1 });
  p1.drawText("• Revenue increased by 28% year-over-year.", { x: 60, y: 575, size: 11, font: font1 });
  p1.drawText("• Enterprise client retention reached 96%.", { x: 60, y: 555, size: 11, font: font1 });
  fs.writeFileSync(path.join(outputDir, "01_clean_report.pdf"), await doc1.save());

  // 2. Dense Table PDF
  const doc2 = await PDFDocument.create();
  const font2 = await doc2.embedFont(StandardFonts.Helvetica);
  const p2 = doc2.addPage([612, 792]);
  p2.drawText("Product Inventory & Pricing Matrix", { x: 50, y: 730, size: 18, font: font2 });
  p2.drawText("SKU | Description | Qty | Unit Price | Total Value", { x: 50, y: 690, size: 12, font: font2 });
  p2.drawText("----------------------------------------------------------------------", { x: 50, y: 675, size: 10, font: font2 });
  p2.drawText("PRD-001 | High Performance Sensor | 150 | $45.00 | $6,750.00", { x: 50, y: 655, size: 11, font: font2 });
  p2.drawText("PRD-002 | Microcontroller Board   | 420 | $12.50 | $5,250.00", { x: 50, y: 635, size: 11, font: font2 });
  p2.drawText("PRD-003 | Power Converter Mod    |  85 | $89.99 | $7,649.15", { x: 50, y: 615, size: 11, font: font2 });
  fs.writeFileSync(path.join(outputDir, "02_dense_table.pdf"), await doc2.save());

  // 3. Scanned Look PDF (minimal native text, mostly visual content)
  const doc3 = await PDFDocument.create();
  const p3 = doc3.addPage([612, 792]);
  p3.drawRectangle({ x: 40, y: 100, width: 532, height: 600, color: rgb(0.9, 0.9, 0.9) });
  p3.drawText("SCANNED RECEIPT - IMAGE CONTENT ONLY", { x: 100, y: 400, size: 16, font: font2 });
  fs.writeFileSync(path.join(outputDir, "03_scanned_receipt.pdf"), await doc3.save());

  // 4. Hybrid Diagram PDF (Text + Embedded Figure)
  const doc4 = await PDFDocument.create();
  const p4 = doc4.addPage([612, 792]);
  p4.drawText("System Architecture Specifications", { x: 50, y: 720, size: 20, font: font2 });
  p4.drawText("Figure 1: Core Signal Processing Dataflow Diagram", { x: 50, y: 680, size: 13, font: font2 });
  p4.drawRectangle({ x: 50, y: 400, width: 500, height: 260, color: rgb(0.85, 0.92, 0.98) });
  p4.drawText("[ DIAGRAM CONTENT ]", { x: 220, y: 530, size: 14, font: font2 });
  p4.drawText("The above architecture processes high-throughput data streams with sub-millisecond latency.", { x: 50, y: 360, size: 11, font: font2 });
  fs.writeFileSync(path.join(outputDir, "04_hybrid_diagram.pdf"), await doc4.save());

  // 5. Form Document PDF
  const doc5 = await PDFDocument.create();
  const p5 = doc5.addPage([612, 792]);
  p5.drawText("Patient Registration Form", { x: 50, y: 720, size: 20, font: font2 });
  p5.drawText("Full Name: John Doe                  Date of Birth: 01/15/1985", { x: 50, y: 670, size: 12, font: font2 });
  p5.drawText("Address: 124 Science Park Way, Suite 400", { x: 50, y: 640, size: 12, font: font2 });
  p5.drawText("Primary Care Physician: Dr. Aris Thorne, MD", { x: 50, y: 610, size: 12, font: font2 });
  fs.writeFileSync(path.join(outputDir, "05_form_document.pdf"), await doc5.save());

  // 6. Multi-heading Article
  const doc6 = await PDFDocument.create();
  const p6 = doc6.addPage([612, 792]);
  p6.drawText("Advances in Neural Architecture Design", { x: 50, y: 720, size: 22, font: fontBold1 });
  p6.drawText("1. Introduction", { x: 50, y: 670, size: 16, font: fontBold1 });
  p6.drawText("Neural networks have transformed computer vision and sequence modeling.", { x: 50, y: 645, size: 11, font: font1 });
  p6.drawText("2. Related Work", { x: 50, y: 610, size: 16, font: fontBold1 });
  p6.drawText("Prior approaches focused on localized convolution operators.", { x: 50, y: 585, size: 11, font: font1 });
  p6.drawText("3. Methodology", { x: 50, y: 550, size: 16, font: fontBold1 });
  p6.drawText("We introduce scaled self-attention mechanism with linear memory overhead.", { x: 50, y: 525, size: 11, font: font1 });
  fs.writeFileSync(path.join(outputDir, "06_multi_heading_article.pdf"), await doc6.save());

  // 7. Code Documentation PDF
  const doc7 = await PDFDocument.create();
  const p7 = doc7.addPage([612, 792]);
  p7.drawText("API Endpoint Handler Implementation", { x: 50, y: 720, size: 18, font: font2 });
  p7.drawText("Below is the core router implementation for processing incoming payload requests:", { x: 50, y: 685, size: 11, font: font2 });
  p7.drawText("function processPayload(req: Request, res: Response) {", { x: 60, y: 640, size: 10, font: font2 });
  p7.drawText("  const data = req.body;", { x: 60, y: 625, size: 10, font: font2 });
  p7.drawText("  if (!data.id) return res.status(400).send('Missing ID');", { x: 60, y: 610, size: 10, font: font2 });
  p7.drawText("  return res.json({ status: 'ok', id: data.id });", { x: 60, y: 595, size: 10, font: font2 });
  p7.drawText("}", { x: 60, y: 580, size: 10, font: font2 });
  fs.writeFileSync(path.join(outputDir, "07_code_documentation.pdf"), await doc7.save());

  // 8. List Heavy Specs PDF
  const doc8 = await PDFDocument.create();
  const p8 = doc8.addPage([612, 792]);
  p8.drawText("Technical Compliance Requirements", { x: 50, y: 720, size: 20, font: font2 });
  p8.drawText("1. Input files must be under 50 MB in total size.", { x: 50, y: 670, size: 11, font: font2 });
  p8.drawText("2. Output payload must adhere strictly to JSON Schema contract.", { x: 50, y: 645, size: 11, font: font2 });
  p8.drawText("3. Processing latency per page must not exceed 2.5 seconds.", { x: 50, y: 620, size: 11, font: font2 });
  p8.drawText("4. Error reporting must indicate specific line or block failure.", { x: 50, y: 595, size: 11, font: font2 });
  fs.writeFileSync(path.join(outputDir, "08_list_heavy_specs.pdf"), await doc8.save());

  // 9. Two Column Paper PDF
  const doc9 = await PDFDocument.create();
  const p9 = doc9.addPage([612, 792]);
  p9.drawText("Distributed Ledger Consensus Analysis", { x: 120, y: 730, size: 18, font: fontBold1 });
  p9.drawText("Column A: Practical Byzantine Fault", { x: 50, y: 680, size: 11, font: fontBold1 });
  p9.drawText("Tolerance ensures correctness in asynchronous", { x: 50, y: 660, size: 10, font: font1 });
  p9.drawText("networks assuming f < n/3 faulty nodes.", { x: 50, y: 645, size: 10, font: font1 });

  p9.drawText("Column B: Proof of Stake Mechanisms", { x: 320, y: 680, size: 11, font: fontBold1 });
  p9.drawText("select block proposers proportionally to", { x: 320, y: 660, size: 10, font: font1 });
  p9.drawText("their committed cryptographic stake balances.", { x: 320, y: 645, size: 10, font: font1 });
  fs.writeFileSync(path.join(outputDir, "09_two_column_paper.pdf"), await doc9.save());

  // 10. Invoice Sample PDF
  const doc10 = await PDFDocument.create();
  const p10 = doc10.addPage([612, 792]);
  p10.drawText("INVOICE #INV-2026-8891", { x: 50, y: 730, size: 22, font: fontBold1 });
  p10.drawText("Billed To: ACME Industrial Corp", { x: 50, y: 685, size: 12, font: font1 });
  p10.drawText("Date: July 24, 2026", { x: 400, y: 685, size: 12, font: font1 });
  p10.drawText("Item | Quantity | Rate | Amount", { x: 50, y: 640, size: 12, font: fontBold1 });
  p10.drawText("Cloud Engine Subscription | 1 | $1,200.00 | $1,200.00", { x: 50, y: 615, size: 11, font: font1 });
  p10.drawText("Custom Integration Support | 10 hrs | $150.00 | $1,500.00", { x: 50, y: 595, size: 11, font: font1 });
  p10.drawText("Total Due: $2,700.00", { x: 380, y: 550, size: 14, font: fontBold1 });
  fs.writeFileSync(path.join(outputDir, "10_invoice_sample.pdf"), await doc10.save());

  // 11. Mixed Multi-page PDF (Page 1 native, Page 2 scan look)
  const doc11 = await PDFDocument.create();
  const p11_1 = doc11.addPage([612, 792]);
  p11_1.drawText("Page 1: Native Text Summary", { x: 50, y: 720, size: 18, font: font2 });
  p11_1.drawText("This page contains clean digital text.", { x: 50, y: 680, size: 12, font: font2 });

  const p11_2 = doc11.addPage([612, 792]);
  p11_2.drawRectangle({ x: 30, y: 50, width: 550, height: 700, color: rgb(0.92, 0.92, 0.92) });
  p11_2.drawText("Page 2: Image Scan Appendix", { x: 100, y: 400, size: 16, font: font2 });
  fs.writeFileSync(path.join(outputDir, "11_mixed_scanned_text.pdf"), await doc11.save());

  // 12. Equations Math PDF
  const doc12 = await PDFDocument.create();
  const p12 = doc12.addPage([612, 792]);
  p12.drawText("Mathematical Formulations", { x: 50, y: 720, size: 20, font: font2 });
  p12.drawText("Equation 1: E = mc^2", { x: 50, y: 670, size: 14, font: font2 });
  p12.drawText("Equation 2: f(x) = integral( 0 to inf, e^(-t) * t^(x-1) dt )", { x: 50, y: 630, size: 12, font: font2 });
  fs.writeFileSync(path.join(outputDir, "12_equations_math.pdf"), await doc12.save());

  // 13. Chart Presentation PDF
  const doc13 = await PDFDocument.create();
  const p13 = doc13.addPage([612, 792]);
  p13.drawText("Q2 Performance Chart Analysis", { x: 50, y: 720, size: 20, font: font2 });
  p13.drawText("Chart 1: Regional Revenue Distribution", { x: 50, y: 680, size: 14, font: font2 });
  p13.drawRectangle({ x: 50, y: 350, width: 500, height: 300, color: rgb(0.95, 0.95, 0.88) });
  p13.drawText("[ PIE CHART VISUAL ]", { x: 230, y: 500, size: 14, font: font2 });
  fs.writeFileSync(path.join(outputDir, "13_chart_presentation.pdf"), await doc13.save());

  // 14. Contract Agreement PDF
  const doc14 = await PDFDocument.create();
  const p14 = doc14.addPage([612, 792]);
  p14.drawText("MUTUAL NON-DISCLOSURE AGREEMENT", { x: 100, y: 730, size: 16, font: fontBold1 });
  p14.drawText("This Mutual Non-Disclosure Agreement ('Agreement') is entered into as of the date signed below.", { x: 50, y: 680, size: 10, font: font1 });
  p14.drawText("1. Confidential Information. Each party agrees to protect proprietary materials disclosed herein.", { x: 50, y: 650, size: 10, font: font1 });
  p14.drawText("2. Term and Termination. This obligation shall persist for a period of five (5) years.", { x: 50, y: 620, size: 10, font: font1 });
  fs.writeFileSync(path.join(outputDir, "14_contract_agreement.pdf"), await doc14.save());

  // 15. Minimal Single Line PDF
  const doc15 = await PDFDocument.create();
  const p15 = doc15.addPage([612, 792]);
  p15.drawText("Minimal PDF Single Line Content Test", { x: 50, y: 700, size: 14, font: font1 });
  fs.writeFileSync(path.join(outputDir, "15_minimal_single_line.pdf"), await doc15.save());

  // 16. Scanned Form PDF
  const doc16 = await PDFDocument.create();
  const p16 = doc16.addPage([612, 792]);
  p16.drawRectangle({ x: 20, y: 20, width: 572, height: 752, color: rgb(0.88, 0.88, 0.88) });
  p16.drawText("SCANNED GOVERNMENT FORM 1099-MISC", { x: 120, y: 400, size: 14, font: font2 });
  fs.writeFileSync(path.join(outputDir, "16_scanned_form.pdf"), await doc16.save());

  console.log("Successfully generated 16 test PDF fixtures in test-fixtures/");
}

generateFixtures().catch(console.error);
