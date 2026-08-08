import { ContentBlock, PageBlock } from "../../types.js";

export async function extractCsv(csvBuffer: Buffer): Promise<PageBlock[]> {
  const text = csvBuffer.toString("utf-8").trim();
  if (!text) {
    return [
      {
        pageNumber: 1,
        blocks: [
          {
            id: "csv_empty_0",
            type: "table",
            content: "[Empty CSV Dataset]",
            sourceMethod: "native",
            confidence: 0.9,
            pageNumber: 1,
          },
        ],
      },
    ];
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const delimiter = detectDelimiter(lines[0] || "");

  const rows: string[][] = lines.map((line) => parseCsvLine(line, delimiter));

  if (rows.length === 0) {
    return [
      {
        pageNumber: 1,
        blocks: [
          {
            id: "csv_empty_1",
            type: "table",
            content: "[Empty CSV Dataset]",
            sourceMethod: "native",
            confidence: 0.9,
            pageNumber: 1,
          },
        ],
      },
    ];
  }

  // Format into clean Markdown Table
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

  const markdownTable = mdLines.join("\n");

  const blocks: ContentBlock[] = [
    {
      id: "csv_head_1",
      type: "heading",
      content: `Dataset Summary (${rows.length - 1} Records, ${maxCols} Columns)`,
      sourceMethod: "native",
      confidence: 0.99,
      pageNumber: 1,
    },
    {
      id: "csv_tbl_1",
      type: "table",
      content: markdownTable,
      sourceMethod: "native",
      confidence: 0.98,
      pageNumber: 1,
    },
  ];

  return [
    {
      pageNumber: 1,
      blocks,
    },
  ];
}

function detectDelimiter(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
