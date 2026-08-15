

import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { catchError, map } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import { ApiService } from "../../core/services";

@Injectable({ providedIn: "root" })
export class messageTraceService {
  constructor(private http: HttpClient, private _api: ApiService) {}



getMessageTrace(messageId: string) {
  const id = encodeURIComponent(String(messageId));
  return this.http
    .get(`${environment.api_url}message-traces/messages/${id}/trace`)
    .pipe(
      map((res: any) => res),
      catchError((error: any) => { throw error; })
    );
}

getAllMessageTraces(messageId: string) {
  const id = encodeURIComponent(String(messageId));
  return this.http
    .get(`${environment.api_url}message-traces/messages/${id}/traces`)
    .pipe(
      map((res: any) => res),
      catchError((error: any) => { throw error; })
    );
}


}

