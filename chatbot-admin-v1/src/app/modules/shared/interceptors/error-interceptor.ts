import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { alert } from '../services/alert.service';
import { Router } from '@angular/router';



@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

    constructor(
        private alert: alert,
        private router: Router,
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request)
            .pipe(
                //retry(1),
                catchError((error: HttpErrorResponse) => {
                    let errorMessage;
                    /*if (error instanceof HttpErrorResponse) {
                        if (error.status === 401) {
                            this.router.navigateByUrl('/user/login');
                        }
                    }*/
                    if (error.error instanceof ErrorEvent) {
                        // console.log('err' + error.error.message)
                        // // client-side error
                        // errorMessage = `Error: ${error.error.message}`;
                        if (error.error.message) {
                            this.alert.actionResponse(errorMessage, 'error');
                        } else {
                
                            // this.router.navigateByUrl('/user/login')
                        }
                    } else {
                        // server-side error

                        // errorMessage = `Error Code: ${error.status} \nMessage: ${error.error.message}`;
                        errorMessage = `${error.error.message}`;
                    }
                    if (error.error.message) {
                        this.alert.actionResponse(errorMessage, 'error');
                    } else {
                        // this.router.navigateByUrl('/user/login')
                    }
                    // this.alert.responseAlert(errorMessage, 'error');
                    return throwError(() => error);
                })
            )
    }
}
