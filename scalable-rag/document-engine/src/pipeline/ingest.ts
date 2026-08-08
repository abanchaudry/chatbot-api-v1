import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { DocumentType } from "../types.js";

export interface IngestedDocument {
  buffer: Buffer;
  documentType: DocumentType;
  filename: string;
  documentId: string;
}

export function ingestInput(input: string | Buffer): IngestedDocument {
  let buffer: Buffer;
  let filename = "document";

  if (typeof input === "string") {
    if (!fs.existsSync(input)) {
      throw new Error(`Input file not found at path: ${input}`);
    }
    buffer = fs.readFileSync(input);
    filename = path.basename(input);
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    throw new Error("Invalid input: must be a file path string or Buffer");
  }

  const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
  const timestamp = Date.now();
  const documentId = `doc_${timestamp}_${hash}`;

  const documentType = detectDocumentType(buffer, filename);

  return {
    buffer,
    documentType,
    filename,
    documentId,
  };
}

function detectDocumentType(buffer: Buffer, filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".pptx") return "pptx";
  if (ext === ".xlsx" || ext === ".xls") return "xlsx";
  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"].includes(ext)) return "image";
  if ([".txt", ".json", ".js", ".ts", ".py", ".md", ".html", ".css", ".c", ".cpp"].includes(ext))
    return "code";

  const header = buffer.slice(0, 8).toString("binary");
  if (header.startsWith("%PDF")) return "pdf";
  if (header.startsWith("\x89PNG") || header.startsWith("\xFF\xD8\xFF")) return "image";

  return "pdf";
}
