import type OpenAI from "openai";
import type { ClassificationCategory } from "./classifier.js";
import { buildAdaptiveTreeChunks, type ChunkTreeResult, type TreeChunkNode } from "./tree-chunker.js";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * 100% AI-Enhanced Semantic Tree Chunker
 * 
 * Architecture:
 * 1. Tier 1 (Large): Verbatim 3,500-character section blocks from source text.
 * 2. Tier 2 (Medium): Verbatim 1,400-character paragraph/sub-topic blocks.
 * 3. Tier 3 (Small): Verbatim sentence/statement units enriched with AI Contextual Prefixes.
 * 
 * Uses LLM specifically for lightweight semantic topic analysis & contextual prefixing,
 * ensuring 100% verbatim text fidelity without JSON truncation or backtick corruption.
 */
export async function buildAiSemanticTreeChunks(
  openai: OpenAI,
  markdownText: string,
  category: ClassificationCategory,
  documentId: string
): Promise<ChunkTreeResult> {
  try {
    const largeNodes: TreeChunkNode[] = [];
    const mediumNodes: TreeChunkNode[] = [];
    const smallNodes: TreeChunkNode[] = [];
    const allNodes: TreeChunkNode[] = [];

    // Step 1: Divide raw text into ~3,500 character verbatim section blocks
    const blocks = splitIntoBlocks(markdownText, 3500);
    let globalChunkCounter = 0;

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const blockText = blocks[bIdx].trim();
      if (!blockText) continue;

      // Tier 1: Large Parent Node (100% Verbatim Source Text)
      const largeId = `${documentId}_L_${++globalChunkCounter}`;
      const largeNode: TreeChunkNode = {
        id: largeId,
        tier: "large",
        chunkIndex: globalChunkCounter,
        parentId: null,
        content: blockText,
        tokenCount: estimateTokens(blockText),
        category,
        children: [],
      };

      largeNodes.push(largeNode);
      allNodes.push(largeNode);

      // Ask LLM for lightweight semantic sub-topic titles & contextual prefixes
      let subTopics: string[] = [];
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert AI RAG Context Architect.
Analyze the provided document section and return a list of 2 to 5 short sub-topic section headers (3-7 words each) that describe the key topics covered in this text.

Output JSON matching this exact schema:
{
  "subTopics": ["Sub-topic Header 1", "Sub-topic Header 2"]
}`,
            },
            {
              role: "user",
              content: `Category: ${category}\n\nSection Text:\n${blockText.slice(0, 3000)}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300,
        });

        const rawJson = response.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed.subTopics) && parsed.subTopics.length > 0) {
          subTopics = parsed.subTopics.map((s: any) => String(s).trim()).filter(Boolean);
        }
      } catch {
        /* fallback to section heading */
      }

      // Tier 2: Medium Paragraph Nodes (Verbatim ~1,400 char sub-topic windows)
      const mediumBlocks = splitByParagraphsOrWindow(blockText, 1400);

      for (let mIdx = 0; mIdx < mediumBlocks.length; mIdx++) {
        const medContent = mediumBlocks[mIdx].trim();
        if (!medContent) continue;

        const topicHeader = subTopics[mIdx] || subTopics[0] || category.replace(/_/g, " ");
        const medId = `${documentId}_M_${++globalChunkCounter}`;
        const medNode: TreeChunkNode = {
          id: medId,
          tier: "medium",
          chunkIndex: globalChunkCounter,
          parentId: largeId,
          content: medContent,
          tokenCount: estimateTokens(medContent),
          category,
          children: [],
        };

        largeNode.children.push(medNode);
        mediumNodes.push(medNode);
        allNodes.push(medNode);

        // Tier 3: Small Leaf Nodes (Verbatim sentence statements + AI Contextual Prefix)
        const smallSentences = splitIntoSentences(medContent, 450);

        for (let sIdx = 0; sIdx < smallSentences.length; sIdx++) {
          const rawSmallText = smallSentences[sIdx].trim();
          if (!rawSmallText) continue;

          // Attach contextual prefix for hyper-accurate RAG vector retrieval
          const contextualContent = `[Context: ${topicHeader}] ${rawSmallText}`;

          const smallId = `${documentId}_S_${++globalChunkCounter}`;
          const smallNode: TreeChunkNode = {
            id: smallId,
            tier: "small",
            chunkIndex: globalChunkCounter,
            parentId: medId,
            content: contextualContent,
            tokenCount: estimateTokens(contextualContent),
            category,
            children: [],
          };

          medNode.children.push(smallNode);
          smallNodes.push(smallNode);
          allNodes.push(smallNode);
        }
      }
    }

    if (allNodes.length === 0) {
      return buildAdaptiveTreeChunks(markdownText, category, documentId);
    }

    return {
      largeChunks: largeNodes,
      mediumChunks: mediumNodes,
      smallChunks: smallNodes,
      allNodes,
    };
  } catch (err) {
    console.warn("AI Semantic Chunking fallback note:", err);
    return buildAdaptiveTreeChunks(markdownText, category, documentId);
  }
}

function splitIntoBlocks(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const blocks: string[] = [];
  let currentBlock = "";

  for (const p of paragraphs) {
    if ((currentBlock + "\n\n" + p).length > maxChars && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = p;
    } else {
      currentBlock = currentBlock ? currentBlock + "\n\n" + p : p;
    }
  }

  if (currentBlock) blocks.push(currentBlock);
  return blocks;
}

function splitByParagraphsOrWindow(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const result: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars && current.length > 0) {
      result.push(current);
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }

  if (current) result.push(current);
  return result.length > 0 ? result : [text];
}

function splitIntoSentences(text: string, maxChars: number): string[] {
  // Protect abbreviations and URLs from naive sentence splits
  const protectedText = text
    .replace(/\b(U\.S\.C|U\.S|Nev|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Co|Corp|vs|etc|e\.g|i\.e)\./gi, "$1___DOT___")
    .replace(/(https?:\/\/[^\s]+)/gi, (url) => url.replace(/\./g, "___DOT___"));

  // Split on paragraph boundaries first, then clean sentence boundaries
  const rawParts = protectedText.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z"“'\(])/);
  const sentences = rawParts.map((p) => p.replace(/___DOT___/g, ".").trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + (current ? "\n\n" : "") + s).length <= maxChars) {
      current = current ? current + "\n\n" + s : s;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}


