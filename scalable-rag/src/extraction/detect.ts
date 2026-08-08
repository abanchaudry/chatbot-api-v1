import type { DocumentType } from "../types.js";

// ─── Magic byte signatures ─────────────────────────────────────────

const SIGNATURES: Array<{ bytes: number[]; offset?: number; type: DocumentType }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], type: "pdf" },        // %PDF-
  { bytes: [0x89, 0x50, 0x4e, 0x47], type: "image" },      // PNG
  { bytes: [0xff, 0xd8, 0xff], type: "image" },             // JPEG
  { bytes: [0x42, 0x4d], type: "image" },                   // BMP
  { bytes: [0x47, 0x49, 0x46, 0x38], type: "image" },      // GIF
];

// ZIP-based Office formats share PK\x03\x04 header — disambiguate by extension
const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];

const EXTENSION_MAP: Record<string, DocumentType> = {
  // Documents
  pdf: "pdf",
  docx: "docx",
  doc: "docx",
  pptx: "pptx",
  ppt: "pptx",
  xlsx: "xlsx",
  xls: "xlsx",
  // Spreadsheet text
  csv: "csv",
  tsv: "csv",
  // Images
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  bmp: "image",
  gif: "image",
  svg: "image",
  // Plain text / code
  txt: "text",
  md: "text",
  py: "text",
  ts: "text",
  js: "text",
  json: "text",
  html: "text",
  xml: "text",
  yaml: "text",
  yml: "text",
  toml: "text",
  ini: "text",
  cfg: "text",
  log: "text",
  sh: "text",
  bat: "text",
  rs: "text",
  go: "text",
  java: "text",
  c: "text",
  cpp: "text",
  h: "text",
  hpp: "text",
  css: "text",
  sql: "text",
  r: "text",
};

const ZIP_OFFICE_TYPES: Record<string, DocumentType> = {
  docx: "docx",
  pptx: "pptx",
  xlsx: "xlsx",
};

// ─── Public API ─────────────────────────────────────────────────────

export interface FileDetectionResult {
  type: DocumentType;
  valid: boolean;
  error?: string;
}

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB (Workers request body limit)

export const SUPPORTED_EXTENSIONS = Object.keys(EXTENSION_MAP);

export function detectFileType(
  data: ArrayBuffer,
  filename: string,
): FileDetectionResult {
  const ext = getExtension(filename);
  const header = new Uint8Array(data, 0, Math.min(data.byteLength, 16));

  // 1. Check known magic byte signatures
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (matchesBytes(header, sig.bytes, offset)) {
      return { type: sig.type, valid: true };
    }
  }

  // 2. Check ZIP header → resolve Office format by extension
  if (matchesBytes(header, ZIP_HEADER, 0)) {
    const officeType = ZIP_OFFICE_TYPES[ext];
    if (officeType) return { type: officeType, valid: true };
    return { type: "unknown", valid: false, error: `ZIP archive with unsupported extension: .${ext}` };
  }

  // 3. Fall back to extension map
  const extType = EXTENSION_MAP[ext];
  if (extType) return { type: extType, valid: true };

  // 4. Heuristic: check if content looks like UTF-8 text
  if (looksLikeText(header)) return { type: "text", valid: true };

  return { type: "unknown", valid: false, error: `Unsupported file format: .${ext || "(none)"}` };
}

export function validateFileSize(size: number): string | null {
  if (size === 0) return "File is empty";
  if (size > MAX_FILE_SIZE) return `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

function matchesBytes(header: Uint8Array, pattern: number[], offset: number): boolean {
  if (header.length < offset + pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (header[offset + i] !== pattern[i]) return false;
  }
  return true;
}

function looksLikeText(sample: Uint8Array): boolean {
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    // Allow tab, newline, carriage return, and printable ASCII
    if (b === 0x09 || b === 0x0a || b === 0x0d) continue;
    if (b >= 0x20 && b <= 0x7e) continue;
    // Allow common UTF-8 lead bytes
    if (b >= 0xc0 && b <= 0xf7) continue;
    // Allow UTF-8 continuation bytes
    if (b >= 0x80 && b <= 0xbf) continue;
    return false;
  }
  return sample.length > 0;
}
