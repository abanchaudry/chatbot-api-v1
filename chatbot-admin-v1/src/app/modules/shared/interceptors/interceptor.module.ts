import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { HttpConfigInterceptor } from './config.interceptors';
import { HttpErrorInterceptor } from './error-interceptor';

export const interceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: HttpConfigInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
];
