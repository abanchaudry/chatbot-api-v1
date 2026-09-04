import { Injectable } from '@angular/core';
import { catchError, map } from "rxjs/operators";
import { throwError } from "rxjs";
import { ApiService } from '../../core/services';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private _api: ApiService) { }


  loginUser(data) {
    return this._api.post(`${"auth/login"}`, data)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }

  getUserById(id: string) {
    return this._api.get(`${"auth/user/" + id}`,)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => throwError(() => error))
      );
  }
}
