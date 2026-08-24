/**
 * Scalable RAG — Pre-Chunking Data Cleaner
 * Normalizes line endings, cleans control characters, repairs broken hyphens,
 * and fixes orphaned Markdown syntax before tree chunking.
 */

export function cleanMarkdownContent(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Normalize line endings (\r\n -> \n, \r -> \n)
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Strip null and non-printable control characters (except newlines and tabs)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 3. Remove embedded base64 images / data URIs (e.g., ![Icon](data:image/png;base64,...))
  text = text.replace(/!\[.*?\]\(data:image\/[^)]+\)/gi, "");
  text = text.replace(/data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]{40,}/gi, "");

  // 4. Remove residual empty/generic markdown image tags (e.g., ![Warning Icon], ![Alert Icon], ![])
  text = text.replace(/!\[[^\]]*\](?:\([^)]*\))?/gi, "");

  // 5. Repair broken hyphenated words at linebreaks (e.g., "infor-\nmation" -> "information")
  text = text.replace(/(\b[a-zA-Z]{2,})-\n([a-zA-Z]{2,}\b)/g, "$1$2");

  // 6. Normalize multiple consecutive blank lines (max 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, "\n\n");

  // 7. Trim trailing whitespace from individual lines
  text = text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");

  // 8. Ensure code blocks are properly closed if orphaned
  const codeBlockCount = (text.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    text += "\n```";
  }

  return text.trim();
}
