import * as path from "path";
import { DocumentType } from "../types.js";

export interface FileValidationResult {
  valid: boolean;
  fileSizeBytes: number;
  documentType: DocumentType;
  filename: string;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB max limit

export function detectAndValidateFile(
  buffer: Buffer,
  originalFilename: string = "document"
): FileValidationResult {
  const fileSizeBytes = buffer.length;

  if (fileSizeBytes === 0) {
    return {
      valid: false,
      fileSizeBytes: 0,
      documentType: "unknown",
      filename: originalFilename,
      error: "Uploaded file is empty (0 bytes).",
    };
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      fileSizeBytes,
      documentType: "unknown",
      filename: originalFilename,
      error: `File size (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 50MB.`,
    };
  }

  const documentType = detectDocumentType(buffer, originalFilename);

  // Check for basic PDF corruption / encryption markers if PDF
  if (documentType === "pdf") {
    const pdfHeader = buffer.slice(0, 1024).toString("binary");
    if (!pdfHeader.includes("%PDF-")) {
      return {
        valid: false,
        fileSizeBytes,
        documentType: "pdf",
        filename: originalFilename,
        error: "Corrupted PDF document: Missing valid %PDF header magic bytes.",
      };
    }

    if (pdfHeader.includes("/Encrypt")) {
      return {
        valid: false,
        fileSizeBytes,
        documentType: "pdf",
        filename: originalFilename,
        error: "Encrypted PDF document: Document is password protected.",
      };
    }
  }

  return {
    valid: true,
    fileSizeBytes,
    documentType,
    filename: originalFilename,
  };
}

function detectDocumentType(buffer: Buffer, filename: string): DocumentType {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  if (ext === ".pptx") return "pptx";
  if (ext === ".xlsx" || ext === ".xls") return "xlsx";
  if (ext === ".csv" || ext === ".tsv") return "csv";
  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"].includes(ext)) return "image";
  if ([".txt", ".json", ".js", ".ts", ".py", ".md", ".html", ".css", ".c", ".cpp", ".rs"].includes(ext))
    return "code";

  // Magic bytes & text fallback
  const header = buffer.slice(0, 8).toString("binary");
  if (header.startsWith("%PDF")) return "pdf";
  if (header.startsWith("\x89PNG") || header.startsWith("\xFF\xD8\xFF")) return "image";
  if (header.startsWith("PK\x03\x04")) return "docx"; // Default zip container

  // Plaintext CSV fallback check
  const sampleStr = buffer.subarray(0, 500).toString("utf-8");
  if (sampleStr.includes(",") && sampleStr.includes("\n") && !sampleStr.includes("{\n")) {
    return "csv";
  }

  return "unknown";
}
