import AdmZip from "adm-zip";
import { ContentBlock, PageBlock, BlockType } from "../../types.js";

export async function extractPptx(pptxBuffer: Buffer): Promise<PageBlock[]> {
  const zip = new AdmZip(pptxBuffer);
  const zipEntries = zip.getEntries();

  const slideEntries = zipEntries
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/\d+/)![0], 10);
      const numB = parseInt(b.entryName.match(/\d+/)![0], 10);
      return numA - numB;
    });

  const pages: PageBlock[] = [];

  slideEntries.forEach((entry, idx) => {
    const xmlContent = entry.getData().toString("utf-8");
    const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
    const textSnippets: string[] = textMatches.map((m) =>
      m.replace(/<[^>]+>/g, "").trim()
    ).filter((t) => t.length > 0);

    const blocks: ContentBlock[] = [];
    textSnippets.forEach((snippet, sIdx) => {
      const type: BlockType = sIdx === 0 ? "heading" : "paragraph";
      blocks.push({
        id: `pptx_${idx}_${sIdx}`,
        type,
        content: snippet,
        sourceMethod: "native",
        confidence: 0.95,
        pageNumber: idx + 1,
      });
    });

    pages.push({
      pageNumber: idx + 1,
      blocks,
    });
  });

  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      blocks: [
        {
          id: "pptx_empty_0",
          type: "paragraph",
          content: "[Empty PPTX Presentation]",
          sourceMethod: "native",
          confidence: 0.9,
          pageNumber: 1,
        },
      ],
    });
  }

  return pages;
}
