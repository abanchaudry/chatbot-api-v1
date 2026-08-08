import mammoth from "mammoth";
import { ContentBlock, PageBlock, BlockType } from "../../types.js";

export async function extractDocx(docxBuffer: Buffer): Promise<PageBlock[]> {
  // Convert Word DOCX to HTML preserving full document structure, tables, and headings
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Code'] => pre:fresh > code:fresh",
      "p[style-name='Code Block'] => pre:fresh > code:fresh",
    ],
  };

  const result = await mammoth.convertToHtml({ buffer: docxBuffer }, options);
  const html = result.value || "";

  if (!html.trim()) {
    return [
      {
        pageNumber: 1,
        blocks: [
          {
            id: "docx_empty_0",
            type: "paragraph",
            content: "[Empty Word Document]",
            sourceMethod: "native",
            confidence: 0.9,
            pageNumber: 1,
          },
        ],
      },
    ];
  }

  // Parse HTML into Production-Level ContentBlocks & PageBlocks
  return parseDocxHtmlToPageBlocks(html);
}

function parseDocxHtmlToPageBlocks(html: string): PageBlock[] {
  const pages: PageBlock[] = [];
  let currentPageNum = 1;
  let currentBlocks: ContentBlock[] = [];

  // Split HTML by page breaks if present, or group by logical sections
  const htmlSections = html.split(/<hr[^>]*class=["']?page-break["']?[^>]*>|<div[^>]*style=["']?[^"']*page-break-before[^"']*["']?[^>]*>/i);

  htmlSections.forEach((sectionHtml, pageIdx) => {
    currentPageNum = pageIdx + 1;
    currentBlocks = [];

    // Process top-level HTML tags
    const tagRegex = /<(h[1-6]|p|ul|ol|table|pre|blockquote|figure)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(sectionHtml)) !== null) {
      const tagName = match[1].toLowerCase();
      const innerHtml = match[2];

      const cleanText = stripHtmlTags(innerHtml).trim();
      if (!cleanText && tagName !== "table") continue;

      let type: BlockType = "paragraph";
      let formattedContent: string | Record<string, unknown> = cleanText;

      if (tagName.startsWith("h")) {
        type = "heading";
        const level = parseInt(tagName.charAt(1), 10) || 1;
        const prefix = "#".repeat(level);
        formattedContent = `${prefix} ${cleanText}`;
      } else if (tagName === "table") {
        type = "table";
        formattedContent = convertHtmlTableToMarkdown(innerHtml);
      } else if (tagName === "pre") {
        type = "code";
        formattedContent = cleanText;
      } else if (tagName === "ul" || tagName === "ol") {
        type = "list";
        formattedContent = convertHtmlListToMarkdown(innerHtml, tagName === "ol");
      } else if (tagName === "blockquote") {
        type = "paragraph";
        formattedContent = `> ${cleanText}`;
      } else if (tagName === "figure") {
        type = "figure";
        formattedContent = cleanText || "[Embedded Image/Figure]";
      } else {
        // Smart Header Promotion for standalone bold titles (e.g., <strong>1. Problem Description</strong>)
        const isWholeBold = /^<(strong|b)[^>]*>([\s\S]*?)<\/\1>$/i.test(innerHtml.trim());
        const isSectionHeaderPattern = /^(\d+(\.\d+)*\s+[A-Z]|Conclusion|Reflection|Abstract|Introduction)/i.test(cleanText);

        if (isWholeBold && isSectionHeaderPattern && cleanText.length < 120) {
          type = "heading";
          formattedContent = `## ${cleanText}`;
        } else {
          type = "paragraph";
          formattedContent = convertInlineFormatting(innerHtml);
        }
      }

      currentBlocks.push({
        id: `docx_${currentPageNum}_${currentBlocks.length}`,
        type,
        content: formattedContent,
        sourceMethod: "native",
        confidence: 0.98,
        pageNumber: currentPageNum,
      });
    }

    // Fallback if regex missed un-nested paragraph lines
    if (currentBlocks.length === 0) {
      const fallbackLines = stripHtmlTags(sectionHtml)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      fallbackLines.forEach((line, idx) => {
        currentBlocks.push({
          id: `docx_${currentPageNum}_${idx}`,
          type: line.length < 80 && line.endsWith(":") ? "heading" : "paragraph",
          content: line,
          sourceMethod: "native",
          confidence: 0.95,
          pageNumber: currentPageNum,
        });
      });
    }

    pages.push({
      pageNumber: currentPageNum,
      blocks: currentBlocks,
    });
  });

  return pages.length > 0 ? pages : [
    {
      pageNumber: 1,
      blocks: [
        {
          id: "docx_fallback_0",
          type: "paragraph",
          content: stripHtmlTags(html),
          sourceMethod: "native",
          confidence: 0.9,
          pageNumber: 1,
        },
      ],
    },
  ];
}

function convertHtmlTableToMarkdown(tableInnerHtml: string): string {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[][] = [];

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableInnerHtml)) !== null) {
    const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const cellText = stripHtmlTags(cellMatch[2]).replace(/[\r\n]+/g, " ").trim();
      cells.push(cellText);
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return "[Table]";

  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalizedRows = rows.map((r) => {
    while (r.length < maxCols) r.push("");
    return r;
  });

  const mdLines: string[] = [];
  // Header row
  mdLines.push(`| ${normalizedRows[0].join(" | ")} |`);
  // Separator row
  mdLines.push(`| ${normalizedRows[0].map(() => "---").join(" | ")} |`);
  // Data rows
  for (let i = 1; i < normalizedRows.length; i++) {
    mdLines.push(`| ${normalizedRows[i].join(" | ")} |`);
  }

  return mdLines.join("\n");
}

function convertHtmlListToMarkdown(listInnerHtml: string, isOrdered: boolean): string {
  const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let itemMatch: RegExpExecArray | null;
  let counter = 1;

  while ((itemMatch = itemRegex.exec(listInnerHtml)) !== null) {
    const itemText = stripHtmlTags(itemMatch[1]).trim();
    if (itemText) {
      const prefix = isOrdered ? `${counter++}.` : "-";
      items.push(`${prefix} ${itemText}`);
    }
  }

  return items.join("\n");
}

function convertInlineFormatting(innerHtml: string): string {
  let text = innerHtml;
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$2`");
  return stripHtmlTags(text).trim();
}

function stripHtmlTags(htmlStr: string): string {
  return htmlStr
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
