import { Injectable } from '@angular/core';
import { catchError, map } from "rxjs/operators";
import { ApiService } from '../../core/services';

@Injectable({
  providedIn: 'root'
})
export class ThreadsService {

  constructor(private _api: ApiService) { }

  getAllThreads() {
    return this._api.get(`${"thread/all"}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }


  getThreadDetail(threadId:string) {
    return this._api.get(`${"thread/detail/" + threadId}`)
      .pipe(
        map((res: any) => res),
        catchError((error: any) => error)
      );
  }

}
