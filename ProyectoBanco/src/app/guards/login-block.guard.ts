import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class LoginBlockGuard implements CanActivate {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(): boolean | UrlTree {
    // In SSR, do nothing; client will redirect after hydration if needed.
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return true;
      const user = JSON.parse(raw);
      if (user && (user.mail || user.mainId)) {
        // Already logged in -> send to role-specific home
        const rol = String(user.rol || user.role || '').toLowerCase();
        if (rol === 'c') return this.router.parseUrl('/home');
        if (rol === 'e' || rol === 'm') return this.router.parseUrl('/novedades');
        return this.router.parseUrl('/');
      }
      return true;
    } catch {
      return true;
    }
  }
}
