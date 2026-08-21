import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable()
export class HttpConfigInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem(environment.token_label);
    const headers: Record<string, string> = {};

    if (token) {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    if (environment.admin_api_key) {
      headers['x-api-key'] = environment.admin_api_key;
    }

    if (Object.keys(headers).length > 0) {
      request = request.clone({
        setHeaders: headers
      });
    }

    return next.handle(request).pipe(
      map((event: HttpEvent<any>) => event),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/auth/login')) {
          localStorage.removeItem(environment.token_label);
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
