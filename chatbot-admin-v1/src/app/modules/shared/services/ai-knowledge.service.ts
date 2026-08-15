import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { ApiService } from '../../core/services';

/* ------------ Types ------------- */
export type ChunkPayload = {
  index: number;
  content: string;
  section?: string;
  tags?: string[];
  topic?: string;
  tier?: string;
  parentId?: string | null;
};

export type FinalizeReviewedChunksBody = {
  fileName: string;
  version: string;
  fileId: string;
  uploadId?: string;
  chunkMethod?: 'semantic' | 'general' | 'adaptive' | 'ai';
  engineMode?: 'offline' | 'hybrid' | 'ai-full' | '';
  embeddingModel?: string; // server default if omitted
  chunks: ChunkPayload[];
};

export type IngestEvent = {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  at: string;
  file_id?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AiKnowledgeService {
  constructor(private _api: ApiService) {}

  /* -------------------------------------------
   * Helpers
   * -----------------------------------------*/
  private handleError(label: string) {
    return (error: any) => {
      console.error(`${label} failed:`, error);
      return throwError(() => error);
    };
  }

  /* -------------------------------------------
   * WRITE / ADMIN FLOWS
   * -----------------------------------------*/

  /** Step 1: Preview chunks (no save). Admin key is added by ApiService. */
  getProcessedChunks(formData: FormData) {
    return this._api.post('data/file-chunks', formData).pipe(
      map((res: any) => res),
      catchError(this.handleError('Preview chunk generation'))
    );
  }

  /** Step 1.5: Fetch KV-cached preview chunks by uploadId */
  getPreviewChunks(uploadId: string) {
    return this._api.get(`data/preview-chunks/${encodeURIComponent(uploadId)}`).pipe(
      map((res: any) => res),
      catchError(this.handleError('Fetch preview chunks from KV'))
    );
  }

  /** Legacy: server re-chunks + embeds from the raw file again. */
  adminIngest(formData: FormData) {
    return this._api.post('data/admin-ingest', formData).pipe(
      map((res: any) => res),
      catchError(this.handleError('Admin ingest'))
    );
  }

  /** Preferred: save already-reviewed chunks (no re-chunking on server). */
  finalizeReviewedChunks(body: FinalizeReviewedChunksBody) {
    return this._api.post('data/save-file-chunks', body).pipe(
      map((res: any) => res),
      catchError(this.handleError('Finalize reviewed chunks'))
    );
  }

  crawlWebUrl(payload: { url: string; category?: string; crawlSchedule?: string }) {
    return this._api.post('crawler/crawl', payload).pipe(
      map((res: any) => res),
      catchError(this.handleError('Web Crawl & Index'))
    );
  }

  discoverLinks(payload: { url: string; maxDepth?: number; maxPages?: number }) {
    return this._api
      .post('crawler/discover', payload)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => { throw error; })
      );
  }

  crawlSelectedPages(payload: { rootUrl: string; crawlSchedule: string; pages: string[] }) {
    return this._api
      .post('crawler/crawl-selected', payload)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => { throw error; })
      );
  }

    deleteFile(fileId: string) {
    return this._api.post(`data/files/${encodeURIComponent(fileId)}`).pipe(
      map((res: any) => res),
      catchError(this.handleError(`Delete fileId=${fileId}`))
    );
  }


  /** Rich progress stream (DB-backed). */
  getIngestEvents(params: { jobId?: string; fileId?: string; limit?: number; sinceId?: number }): Observable<{ ok: boolean; events: IngestEvent[] }> {
    let p = new HttpParams();
    if (params.jobId) p = p.set('jobId', params.jobId);
    if (params.fileId) p = p.set('fileId', params.fileId);
    if (params.limit) p = p.set('limit', String(params.limit));
    if (params.sinceId) p = p.set('sinceId', String(params.sinceId));
    return this._api.get('data/ingest-events', p).pipe(
      map((res: any) => res),
      catchError(this.handleError('Fetch ingest events'))
    );
  }

  /* -------------------------------------------
   * READ-ONLY / DASHBOARD
   * -----------------------------------------*/

  /** Legacy in-memory progress (keep for now). */
  progress(uploadId: string) {
    return this._api.get(`data/progress/${encodeURIComponent(uploadId)}`).pipe(
      map((res: any) => res),
      catchError(this.handleError('Progress polling'))
    );
  }

  getDashboardStats() {
    return this._api.get('data/stats').pipe(
      map((res: any) => res),
      catchError(this.handleError('Fetch dashboard stats'))
    );
  }

  getFileChunks(fileId: string, page: number = 1, perPage: number = 50, search: string = '') {
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    return this._api
      .get(`data/chunks?fileId=${encodeURIComponent(fileId)}&page=${page}&perPage=${perPage}${q}`)
      .pipe(
        map((res: any) => res),
        catchError(this.handleError(`Fetch chunks for fileId=${fileId}`))
      );
  }

  getAllChunks(page: number = 1, perPage: number = 50, search: string = '') {
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    return this._api
      .get(`data/chunks-all?page=${page}&perPage=${perPage}${q}`)
      .pipe(
        map((res: any) => res),
        catchError(this.handleError('Fetch all chunks'))
      );
  }

  getAiKnowledgeData() {
    return this._api.get('data/list').pipe(
      map((res: any) => res),
      catchError(this.handleError('Fetch AI knowledge list'))
    );
  }

  downloadFile(fileId: string) {
    return this._api.getBlob(`data/files/${fileId}/download`);
  }

  getRelatedTiers(chunkId: string) {
    return this._api.get(`data/chunks/${encodeURIComponent(chunkId)}/related`).pipe(
      map((res: any) => res),
      catchError(this.handleError(`Fetch related tiers for chunkId=${chunkId}`))
    );
  }

  updateChunk(chunkId: string, updates: { content: string; topic?: string; section?: string; tags?: string[] | string; relatedTiers?: any[] }) {
    return this._api.post(`data/chunks/${encodeURIComponent(chunkId)}`, updates).pipe(
      map((res: any) => res),
      catchError(this.handleError(`Update chunkId=${chunkId}`))
    );
  }

  deleteChunk(chunkId: string) {
    return this._api.delete(`data/chunks/${encodeURIComponent(chunkId)}`).pipe(
      map((res: any) => res),
      catchError(this.handleError(`Delete chunkId=${chunkId}`))
    );
  }
}
