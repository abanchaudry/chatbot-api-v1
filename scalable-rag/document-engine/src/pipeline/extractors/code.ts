import { ContentBlock, PageBlock, BlockType } from "../../types.js";

export async function extractCodeOrText(textBuffer: Buffer): Promise<PageBlock[]> {
  // Binary safety check: if buffer contains null bytes \x00 or unprintable control characters, return empty block array
  const sample = textBuffer.subarray(0, 1000);
  let nullBytes = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) nullBytes++;
  }
  if (nullBytes > 2) {
    // Binary file detected (image, zip, pdf, executable)
    return [{ pageNumber: 1, blocks: [] }];
  }

  const text = textBuffer.toString("utf-8");
  const lines = text.split("\n");

  const blocks: ContentBlock[] = [];
  let currentCodeLines: string[] = [];

  const flushCode = () => {
    if (currentCodeLines.length === 0) return;
    const codeSnippet = currentCodeLines.join("\n");
    blocks.push({
      id: `code_${blocks.length}`,
      type: "code",
      content: codeSnippet,
      sourceMethod: "native",
      confidence: 0.99,
      pageNumber: 1,
    });
    currentCodeLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("# ") || line.startsWith("## ")) {
      flushCode();
      blocks.push({
        id: `head_${blocks.length}`,
        type: "heading",
        content: line.replace(/^#+\s*/, "").trim(),
        sourceMethod: "native",
        confidence: 0.99,
        pageNumber: 1,
      });
    } else {
      currentCodeLines.push(line);
    }
  }
  flushCode();

  return [
    {
      pageNumber: 1,
      blocks,
    },
  ];
}
