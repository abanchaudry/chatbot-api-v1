import AdmZip from "adm-zip";
import { ContentBlock, PageBlock } from "../../types.js";

export async function extractXlsx(xlsxBuffer: Buffer): Promise<PageBlock[]> {
  const zip = new AdmZip(xlsxBuffer);
  const zipEntries = zip.getEntries();

  const sharedStringsEntry = zipEntries.find((e) =>
    /^xl\/sharedStrings\.xml$/i.test(e.entryName)
  );
  const sharedStrings: string[] = [];
  if (sharedStringsEntry) {
    const xml = sharedStringsEntry.getData().toString("utf-8");
    const matches = xml.match(/<t[^>]*>(.*?)<\/t>/gi) || [];
    matches.forEach((m) => {
      sharedStrings.push(m.replace(/<[^>]+>/g, ""));
    });
  }

  const sheetEntries = zipEntries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/\d+/)![0], 10);
      const numB = parseInt(b.entryName.match(/\d+/)![0], 10);
      return numA - numB;
    });

  const pages: PageBlock[] = [];

  sheetEntries.forEach((entry, idx) => {
    const xml = entry.getData().toString("utf-8");
    const rowMatches = xml.match(/<row[^>]*>(.*?)<\/row>/gi) || [];

    const tableRows: string[][] = [];
    rowMatches.forEach((rowXml) => {
      const cellMatches = rowXml.match(/<c[^>]*>(.*?)<\/c>/gi) || [];
      const rowVals: string[] = [];
      cellMatches.forEach((cellXml) => {
        const isShared = cellXml.includes('t="s"');
        const vMatch = cellXml.match(/<v>(.*?)<\/v>/i);
        if (vMatch) {
          const val = vMatch[1];
          if (isShared) {
            const ssIdx = parseInt(val, 10);
            rowVals.push(sharedStrings[ssIdx] || val);
          } else {
            rowVals.push(val);
          }
        }
      });
      if (rowVals.length > 0) {
        tableRows.push(rowVals);
      }
    });

    const blocks: ContentBlock[] = [
      {
        id: `xlsx_head_${idx}`,
        type: "heading",
        content: `Sheet ${idx + 1}`,
        sourceMethod: "native",
        confidence: 0.98,
        pageNumber: idx + 1,
      },
      {
        id: `xlsx_tbl_${idx}`,
        type: "table",
        content: {
          rows: tableRows,
          rowCount: tableRows.length,
        },
        sourceMethod: "native",
        confidence: 0.95,
        pageNumber: idx + 1,
      },
    ];

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
          id: "xlsx_empty_0",
          type: "table",
          content: { rows: [] },
          sourceMethod: "native",
          confidence: 0.9,
          pageNumber: 1,
        },
      ],
    });
  }

  return pages;
}
