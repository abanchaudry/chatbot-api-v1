// chatbot-admin-v1/src/app/modules/shared/guards/super-admin.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem(environment.token_label);
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
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(payloadJson);

        // Check if role is super_admin
        if (payload.role === 'super_admin') {
          return true;
        }
      }
    } catch {}

    // Redirect regular client admins to standard dashboard
    this.router.navigate(['/dashboard']);
    return false;
  }
}
