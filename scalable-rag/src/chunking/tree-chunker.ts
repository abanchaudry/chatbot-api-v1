import type { ClassificationCategory } from "./classifier.js";

export interface TreeChunkNode {
  id: string;
  tier: "large" | "medium" | "small";
  chunkIndex: number;
  parentId: string | null;
  content: string;
  tokenCount: number;
  category: ClassificationCategory;
  children: TreeChunkNode[];
}

export interface ChunkTreeResult {
  largeChunks: TreeChunkNode[];
  mediumChunks: TreeChunkNode[];
  smallChunks: TreeChunkNode[];
  allNodes: TreeChunkNode[];
}

/**
 * Estimate token count (~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Adaptive 3-Tier Tree Chunker Engine
 * Generates Large (~1000 tokens), Medium (~400 tokens), and Small (~150 tokens)
 * parent-child chunk trees tailored to document classification.
 */
export function buildAdaptiveTreeChunks(
  markdownText: string,
  category: ClassificationCategory,
  documentId: string
): ChunkTreeResult {
  const largeNodes: TreeChunkNode[] = [];
  const mediumNodes: TreeChunkNode[] = [];
  const smallNodes: TreeChunkNode[] = [];
  const allNodes: TreeChunkNode[] = [];

  // Step 1: Split document into Tier 1 Large Parent Chunks (~1,000 tokens / 3,500 chars)
  const rawLargeTexts = splitByWindowOrHeading(markdownText, 3500, 300);

  let globalChunkCounter = 0;

  for (let lIdx = 0; lIdx < rawLargeTexts.length; lIdx++) {
    const largeContent = rawLargeTexts[lIdx].trim();
    if (!largeContent) continue;

    globalChunkCounter++;
    const largeId = `${documentId}_L_${globalChunkCounter}`;
    const largeNode: TreeChunkNode = {
      id: largeId,
      tier: "large",
      chunkIndex: globalChunkCounter,
      parentId: null,
      content: largeContent,
      tokenCount: estimateTokens(largeContent),
      category,
      children: [],
    };
    largeNodes.push(largeNode);
    allNodes.push(largeNode);

    // Step 2: Split Large Parent Chunk into Tier 2 Medium Chunks (~400 tokens / 1,400 chars)
    const rawMediumTexts = splitByWindowOrHeading(largeContent, 1400, 150);

    for (let mIdx = 0; mIdx < rawMediumTexts.length; mIdx++) {
      const mediumContent = rawMediumTexts[mIdx].trim();
      if (!mediumContent) continue;

      globalChunkCounter++;
      const mediumId = `${documentId}_M_${globalChunkCounter}`;
      const mediumNode: TreeChunkNode = {
        id: mediumId,
        tier: "medium",
        chunkIndex: globalChunkCounter,
        parentId: largeId,
        content: mediumContent,
        tokenCount: estimateTokens(mediumContent),
        category,
        children: [],
      };
      mediumNodes.push(mediumNode);
      largeNode.children.push(mediumNode);
      allNodes.push(mediumNode);

      // Step 3: Split Medium Chunk into Tier 3 Small Leaf Chunks (~150 tokens / 500 chars)
      // using Category-Specific Adaptive Splitting Rules!
      const rawSmallTexts = splitCategoryAdaptive(mediumContent, category);

      for (let sIdx = 0; sIdx < rawSmallTexts.length; sIdx++) {
        const smallContent = rawSmallTexts[sIdx].trim();
        if (!smallContent) continue;

        globalChunkCounter++;
        const smallId = `${documentId}_S_${globalChunkCounter}`;
        const smallNode: TreeChunkNode = {
          id: smallId,
          tier: "small",
          chunkIndex: globalChunkCounter,
          parentId: mediumId,
          content: smallContent,
          tokenCount: estimateTokens(smallContent),
          category,
          children: [],
        };
        smallNodes.push(smallNode);
        mediumNode.children.push(smallNode);
        allNodes.push(smallNode);
      }
    }
  }

  return {
    largeChunks: largeNodes,
    mediumChunks: mediumNodes,
    smallChunks: smallNodes,
    allNodes,
  };
}

/**
 * Category-Specific Adaptive Leaf Splitting
 */
function splitCategoryAdaptive(text: string, category: ClassificationCategory): string[] {
  switch (category) {
    case "FAQ_Knowledgebase":
      return splitFAQ(text);
    case "Financial_Tabular":
      return splitTabular(text);
    case "Code_Technical":
      return splitCodeTechnical(text);
    case "Legal_Regulatory":
      return splitLegalClause(text);
    case "Medical_Scientific":
      return splitMedicalScientific(text);
    case "Form_KeyValue":
      return splitFormKeyValue(text);
    case "Prose_Standard":
    default:
      return splitStandardProse(text, 500, 75);
  }
}

/**
 * FAQ Splitting — Keeps Q&A pairs intact
 */
function splitFAQ(text: string): string[] {
  // Regex boundary: (?=\bQ:|\bQuestion:|\b###?\s*Q)
  const parts = text.split(/(?=\bQ:|\bQuestion:|\b###?\s*Q|\bFAQ:)/i);
  const chunks: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.length > 800) {
      chunks.push(...splitStandardProse(trimmed, 500, 75));
    } else {
      chunks.push(trimmed);
    }
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Tabular Splitting — Preserves Table Header for every split chunk
 */
function splitTabular(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let tableHeader = "";
  let currentChunkLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("|") && lines[i + 1]?.includes("---") && !tableHeader) {
      tableHeader = line + "\n" + lines[i + 1];
    }

    currentChunkLines.push(line);
    const currentLen = currentChunkLines.join("\n").length;

    if (currentLen >= 500) {
      chunks.push(currentChunkLines.join("\n"));
      currentChunkLines = tableHeader ? [tableHeader] : [];
    }
  }

  if (currentChunkLines.length > 0) {
    chunks.push(currentChunkLines.join("\n"));
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * Code/Technical Splitting — Preserves code block integrity
 */
function splitCodeTechnical(text: string): string[] {
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = text.split(codeBlockRegex);
  const chunks: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("```")) {
      chunks.push(trimmed);
    } else {
      chunks.push(...splitStandardProse(trimmed, 500, 75));
    }
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Legal/Regulatory Splitting — Splits by numbered section/clause boundaries
 */
function splitLegalClause(text: string): string[] {
  const parts = text.split(/(?=\bSection\s+\d|\bClause\s+\d|\bArticle\s+[I|V|X|\d]|\n(?=\d+\.\d+))/i);
  const chunks: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.length > 800) {
      chunks.push(...splitStandardProse(trimmed, 500, 75));
    } else {
      chunks.push(trimmed);
    }
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Medical/Scientific Splitting — Splits by paper section headings
 */
function splitMedicalScientific(text: string): string[] {
  const parts = text.split(/(?=\bAbstract\b|\bIntroduction\b|\bMethods\b|\bResults\b|\bDiscussion\b|\bConclusion\b|\bReferences\b)/i);
  const chunks: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    chunks.push(...splitStandardProse(trimmed, 500, 75));
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Form Key-Value Splitting
 */
function splitFormKeyValue(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentGroup: string[] = [];

  for (const line of lines) {
    currentGroup.push(line);
    if (currentGroup.join("\n").length >= 450) {
      chunks.push(currentGroup.join("\n"));
      currentGroup = [];
    }
  }
  if (currentGroup.length > 0) chunks.push(currentGroup.join("\n"));
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Standard Prose Splitting (Sentence boundary with overlap)
 */
function splitStandardProse(text: string, maxChars: number, overlapChars: number): string[] {
  // Protect abbreviations and URLs from naive sentence splits
  const protectedText = text
    .replace(/\b(U\.S\.C|U\.S|Nev|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Co|Corp|vs|etc|e\.g|i\.e)\./gi, "$1___DOT___")
    .replace(/(https?:\/\/[^\s]+)/gi, (url) => url.replace(/\./g, "___DOT___"));

  const rawParts = protectedText.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z"“'\(])/);
  const sentences = rawParts.map((p) => p.replace(/___DOT___/g, ".").trim()).filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + (currentChunk ? " " : "") + sentence).length <= maxChars) {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + " " + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}


/**
 * Window or Heading Splitter
 */
function splitByWindowOrHeading(text: string, targetChars: number, overlapChars: number): string[] {
  const sections = text.split(/(?=\n#{1,4}\s)/);
  const chunks: string[] = [];
  let current = "";

  for (const sec of sections) {
    if ((current + sec).length <= targetChars) {
      current += sec;
    } else {
      if (current) chunks.push(current.trim());
      if (sec.length > targetChars) {
        chunks.push(...splitStandardProse(sec, targetChars, overlapChars));
        current = "";
      } else {
        current = sec;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}
