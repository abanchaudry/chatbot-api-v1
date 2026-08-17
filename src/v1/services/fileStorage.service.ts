import type { Context } from "hono";

export type FileStoragePutResult = {
  key: string;
};

export class FileStorageService {
  static sanitizeFileName(name: string) {
    const cleaned = (name || "file.txt")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.length ? cleaned : "file.txt";
  }

  static buildPrivateOriginalKey(fileId: string, fileName: string) {
    const safe = FileStorageService.sanitizeFileName(fileName);
    return `knowledge/original/${fileId}/${safe}`;
  }

  static async putOriginalTextToPrivateR2(
    c: Context,
    fileId: string,
    fileName: string,
    rawText: string
  ): Promise<FileStoragePutResult> {
    const key = FileStorageService.buildPrivateOriginalKey(fileId, fileName);
    const safeName = FileStorageService.sanitizeFileName(fileName);
    const body = new TextEncoder().encode(rawText);

    await c.env.apogee_private.put(key, body, {
      httpMetadata: {
        contentType: "text/plain; charset=utf-8",
        contentDisposition: `attachment; filename="${safeName}"`,
      },
      customMetadata: {
        file_id: fileId,
        file_name: safeName,
        stored_at: new Date().toISOString(),
      },
    });

    return { key };
  }

  static async getPrivateObjectByKey(c: Context, key: string) {
    return c.env.apogee_private.get(key);
  }

  static buildDownloadResponse(body: ReadableStream | null, fileName: string) {
    const safeName = FileStorageService.sanitizeFileName(fileName);
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  static async deleteFromR2(c: Context, key?: string | null): Promise<void> {
    if (!key) return;
    try {
      if (c.env?.apogee_private) {
        await c.env.apogee_private.delete(key);
      }
      if (c.env?.apogee_public) {
        await c.env.apogee_public.delete(key);
      }
    } catch (err: any) {
      console.warn(`[FileStorageService] Failed to delete key from R2: ${key}`, err?.message);
    }
  }
}
