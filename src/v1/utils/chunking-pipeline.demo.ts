/**
 * Test/Demo of improved chunking pipeline
 * Shows how the enhancements work together
 */

import { ContentCleaner } from "./content-cleaner";
import { MetadataExtractor, type ChunkMetadata } from "./metadata-extractor";
import { ChunkEnricher } from "./chunk-enricher";

// Sample document from your test (with UI artifacts)
const sampleDocument = `Document Requests
New more convenient document ordering system -- Example Company and Document Provider

Example Company has partnered with a document provider to handle processing and delivery of association documents. To begin your request you will be transferred to the provider's website. Once there you will need to create a new user account and follow the online instructions. Once accepted, the provider will process and deliver your order.

Click on the button "Request Documents" to open new browser window with CondoCerts

Request Documents

Link to first time users guide for CondoCerts web site:  

Click Here for CondoCerts Users Guide

×

Link to CondoCerts web site FAQ and Tip Sheet:  

Click Here for CondoCerts FAQ and Tips

×

Or call CondoCerts Customer Service at 1 800 310 6552

 
PURSUANT TO NRS 116.4109:
AUTHORIZED AGENT HAS 10 DAYS TO PROVIDE DOCUMENTATION TO THE REQUESTOR FROM THE DATE THE WRITTEN REQUEST IS RECEIVED.
SUBMISSION OF PAYMENT VIA THE SYSTEM IS CONSIDERED A WRITTEN REQUEST!`;

/**
 * Example: Full chunking pipeline with improvements
 */
export async function demonstrateImprovedChunking() {
  console.log("=== Document Chunking Pipeline with Improvements ===\n");

  // Step 1: Clean content
  console.log("STEP 1: Content Cleaning");
  console.log("------------------------");
  const { cleaned, metadata: extractedMeta } = ContentCleaner.cleanContent(
    sampleDocument,
    {
      removeUIArtifacts: true,
      normalizeWhitespace: true,
      extractMetadata: true,
    }
  );

  const quality = ContentCleaner.analyzeContentQuality(sampleDocument, cleaned);
  console.log(`✓ Artifacts removed: ${quality.artifactsRemoved}`);
  console.log(`✓ Compression: ${quality.compressionRatio}%`);
  console.log(`✓ Metadata found: ${quality.hasMetadata}`);
  console.log(`✓ Phone numbers: ${extractedMeta.phoneNumbers.length}`);
  console.log(`✓ Important dates: ${extractedMeta.importantDates.length}`);

  // Show cleaned content
  console.log("\nCleaned content preview:");
  console.log(cleaned.substring(0, 250) + "...\n");

  // Step 2: Create sample chunks (as if from GPT)
  console.log("STEP 2: Creating Sample Chunks");
  console.log("------------------------------");
  const rawChunks = [
    {
      content:
        "Example Company has partnered with a document provider to handle processing and delivery of association documents. To begin your request you will be transferred to the provider's website. Once there you will need to create a new user account and follow the online instructions.",
      section: "Document Ordering System",
      topic: "guide",
      tags: ["Example Company", "document provider"],
      index: 0,
    },
    {
      content:
        "For document request assistance, contact CondoCerts Customer Service at 1 800 310 6552. They provide user guides for first-time users and comprehensive FAQ documentation.",
      section: "Getting Help",
      topic: "support",
      tags: ["support", "contact"],
      index: 1,
    },
    {
      content:
        "Under NRS 116.4109, authorized agents must provide documentation within 10 days of written request. Payment submission via the system is considered a written request.",
      section: "Legal Requirements",
      topic: "legal",
      tags: ["compliance"],
      index: 2,
    },
  ];

  console.log(`✓ Generated ${rawChunks.length} chunks\n`);

  // Step 3: Extract metadata from each chunk
  console.log("STEP 3: Metadata Extraction");
  console.log("---------------------------");
  const chunkMetadata: ChunkMetadata[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const meta = MetadataExtractor.extractMetadata(rawChunks[i].content);
    chunkMetadata.push(meta);
    console.log(
      `Chunk ${i}: phones=${meta.phoneNumbers?.length || 0}, regs=${meta.regulations?.length || 0}, deadline=${meta.deadlineDays}d, importance=${meta.importance}`
    );
  }
  console.log();

  // Step 4: Enrich chunks
  console.log("STEP 4: Chunk Enrichment");
  console.log("------------------------");
  const enrichedChunks = ChunkEnricher.enrichChunks(rawChunks as any, cleaned);

  for (let i = 0; i < enrichedChunks.length; i++) {
    const ch = enrichedChunks[i];
    console.log(`\nChunk ${i}: ${ch.section}`);
    console.log(`  Section: ${ch.section}`);
    console.log(`  Topic: ${ch.topic}`);
    console.log(`  Tags: ${ch.tags.join(", ")}`);
    console.log(`  Preview: ${ch.firstSentencePreview.substring(0, 80)}...`);
    console.log(`  Reading time: ${ch.estimatedReadingTime} min`);
  }

  // Step 5: Validate
  console.log("\n\nSTEP 5: Quality Validation");
  console.log("---------------------------");
  const validation = ChunkEnricher.validateEnrichedChunks(enrichedChunks as any);
  console.log(`✓ Valid: ${validation.valid}`);
  if (validation.issues.length > 0) {
    console.log("Issues found:");
    validation.issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log("✓ No issues found!");
  }

  // Step 6: Show final result
  console.log("\n\nSTEP 6: Final Enhanced Chunks (JSON)");
  console.log("------------------------------------");
  const finalResult = {
    totalChunks: enrichedChunks.length,
    quality,
    metadata: extractedMeta,
    chunks: enrichedChunks.map((ch) => ({
      index: ch.index,
      section: ch.section,
      topic: ch.topic,
      tags: ch.tags,
      contentLength: ch.contentLength,
      contentPreview: ch.firstSentencePreview,
    })),
  };

  console.log(JSON.stringify(finalResult, null, 2));

  console.log("\n=== Pipeline Complete ===");
}
