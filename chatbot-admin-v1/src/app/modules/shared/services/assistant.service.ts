import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, map } from "rxjs/operators";
import { ApiService } from '../../core/services';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {

  constructor(private _api: ApiService) { }

  getAllAssistant() {
    return this._api.get(`${"assistant/all"}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  getAssistant(assistantId:string) {
    return this._api.get(`${"assistant/" + assistantId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  createAssistant(data:any) {
    return this._api.post(`${"assistant"}`, data)

      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  updateAssistant(assistantId: string, data: any) {
    return this._api.put(`${"assistant/" + assistantId}`, data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  deleteAssistant(assistantId: string) {
    return this._api.delete(`${"assistant/" + assistantId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  getVectorStoreFiles(vectorStoreId: string) {
    return this._api.get(`${"assistant/vector-store/" + vectorStoreId + "/files"}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  getVectorStoreAndFiles(vectorStoreId: string) {
    return this.getVectorStoreFiles(vectorStoreId);
  }

  deleteVectorStoreFile(vectorStoreId: string, fileId: string) {
    return this._api.delete(`${"assistant/vector-store/" + vectorStoreId + "/files/" + fileId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  getSettings() {
    return this._api.get("settings")
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  saveSettings(data: any) {
    return this._api.post("settings", data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  generateDomainPrompt(data: { companyName: string; rawDescription: string }) {
    return this._api.post("settings/generate-domain", data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }
}
