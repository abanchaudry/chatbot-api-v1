import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { catchError, map } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import { ApiService } from "../../core/services";

@Injectable({ providedIn: "root" })
export class filesService {
  constructor(private http: HttpClient, private _api: ApiService) {}

  uploadFile(file: File, strategy: string = "general", uploadId: string) {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("strategy", strategy);
    formData.append("uploadId", uploadId);
    return this.http
      .post(environment.api_url + "v2/file/upload-v2", formData)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

  deleteFile(vectorStoreId: string, fileId: string) {
    const url = `assistant/vector-store/${vectorStoreId}/files/${fileId}`;
    return this._api.delete(url).pipe(
      map((res: any) => {
        return res;
      }),
      catchError((error: any) => {
        console.error("Error deleting file:", error);
        return error(
          () => new Error("Failed to delete file. Please try again later.")
        );
      })
    );
  }

  progress(uploadId: string) {
    return this._api.get(`${"v2/file/progress/" + uploadId}`).pipe(
      map((res: any) => res),
      catchError((error: any) => error)
    );
  }
}
// getAiKnowledgeData() {
//   return this._api.get(`${"v2/file/list"}`).pipe(
//     map((res: any) => res),
//     catchError((error: any) => error)
//   );
// }
