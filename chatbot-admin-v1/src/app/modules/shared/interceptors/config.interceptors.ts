//httpConfig.interceptor.ts
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
import { environment } from 'src/environments/environment';
@Injectable()
export class HttpConfigInterceptor implements HttpInterceptor {
    loaderToShow: any;
    constructor(
    ) { }


    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const token = localStorage.getItem(environment.token_label);
        if (token) {
            request = request.clone({
                setHeaders: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            map((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse) {
                }
                return event;
            }),
            catchError((error: HttpErrorResponse) => {            
                return throwError(() => error);
            }));
    }




}
