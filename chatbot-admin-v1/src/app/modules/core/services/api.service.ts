import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Router } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private route: Router) {}

  /** Build headers; omit Content-Type when body is FormData */
  private buildHeaders(body?: any, extra?: Record<string, string>): HttpHeaders {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // only set JSON content-type when NOT sending FormData
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // optional admin key
    if (environment.admin_api_key) {
      headers["x-api-key"] = environment.admin_api_key;
    }

    // auth token if present
    const token = localStorage.getItem(environment.token_label);
    if (token) {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      headers["Authorization"] = `Bearer ${cleanToken}`;
    }

    // allow caller to override/extend
    if (extra) Object.assign(headers, extra);

    return new HttpHeaders(headers);
  }

  private formatErrors(error: any) {
    return throwError(() => error);
  }

  get(path: string, httpParams: HttpParams = new HttpParams()): Observable<any> {
    return this.http
      .get(`${environment.api_url}${path}`, {
        headers: this.buildHeaders(),
        params: httpParams,
      })
      .pipe(catchError(this.formatErrors));
  }

  put(path: string, body: any = {}): Observable<any> {
    const headers = this.buildHeaders(body);
    const payload = body instanceof FormData ? body : JSON.stringify(body);
    return this.http
      .put(`${environment.api_url}${path}`, payload, { headers })
      .pipe(catchError(this.formatErrors));
  }

  patch(path: string, body: any = {}): Observable<any> {
    const headers = this.buildHeaders(body);
    const payload = body instanceof FormData ? body : JSON.stringify(body);
    return this.http
      .patch(`${environment.api_url}${path}`, payload, { headers })
      .pipe(catchError(this.formatErrors));
  }

  /** Auto-detects FormData and sets correct headers/payload */
  post(path: string, body: any = {}): Observable<any> {
    const headers = this.buildHeaders(body);
    const payload = body instanceof FormData ? body : JSON.stringify(body);
    return this.http
      .post(`${environment.api_url}${path}`, payload, { headers })
      .pipe(catchError(this.formatErrors));
  }

  /** Explicit helper for multipart uploads if you prefer to be clear at callsite */
  postForm(path: string, form: FormData, extraHeaders?: Record<string, string>): Observable<any> {
    const headers = this.buildHeaders(form, extraHeaders);
    return this.http
      .post(`${environment.api_url}${path}`, form, { headers })
      .pipe(catchError(this.formatErrors));
  }

  login(path: string, body: any): Observable<any> {
    // login typically sends JSON; if you ever pass FormData here, the post() above will handle it too
    return this.post(path, body);
  }

  delete(path: string): Observable<any> {
    return this.http
      .delete(`${environment.api_url}${path}`, { headers: this.buildHeaders() })
      .pipe(catchError(this.formatErrors));
  }

getBlob(path: string, extraHeaders?: Record<string, string>, params?: any): Observable<Blob> {
  const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;

  let headers = this.buildHeaders();
  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([k, v]) => {
      headers = headers.set(k, v);
    });
  }

  return this.http
    .get(`${environment.api_url}${path}`, {
      params: httpParams,
      headers,
      responseType: "blob",
    })
    .pipe(catchError(this.formatErrors));
}

}
