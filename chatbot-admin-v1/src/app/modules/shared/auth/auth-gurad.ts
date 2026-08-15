import { Injectable } from "@angular/core";
import { Router, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

@Injectable({
    providedIn: 'root'
  })
  export class AuthGuard {
    user = false;
  
    constructor(private router: Router) { 
    }
    canActivate():
      | Observable<boolean | UrlTree>
      | Promise<boolean | UrlTree>
      | boolean
      | UrlTree {
        let token = localStorage.getItem(environment.token_label);
      if (!token) {
        this.router.navigate(['/login']);
        return false;
      } 
      return true;
    }
  }




