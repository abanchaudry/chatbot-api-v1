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
  canActivate(): boolean {
    let token = localStorage.getItem(environment.token_label);
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      const parts = cleanToken.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(payloadJson);
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem(environment.token_label);
          this.router.navigate(['/login']);
          return false;
        }
      }
    } catch {
      localStorage.removeItem(environment.token_label);
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
  }




