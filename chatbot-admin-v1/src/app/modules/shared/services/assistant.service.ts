import { Injectable } from '@angular/core';
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
        catchError((error: any) => error)
      );
  }

  getAssistant(assistantId:string) {
    return this._api.get(`${"assistant/detail/" + assistantId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  getAssistantModels() {
    return this._api.get(`${"assistant/models"}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  updateAssistant(id: string, data) {
    return this._api.put(`${"assistant/update/" + id}`, data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  askAssistant(data) {
    return this._api.post(`${"assistant/ask"}`, data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  getVectorStoreAndFiles(vectorStoreId: string) {
    return this._api.get(`${"assistant/vector-store/" + vectorStoreId + "/files"}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  deleteVectorStoreFile(vectorStoreId: string, fileId: string) {
    return this._api.delete(`${"assistant/vector-store/" + vectorStoreId + "/files/" + fileId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  getSettings() {
    return this._api.get("settings")
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  saveSettings(data: any) {
    return this._api.post("settings", data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  generateDomainPrompt(data: { companyName: string; rawDescription: string }) {
    return this._api.post("settings/generate-domain", data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }
}
