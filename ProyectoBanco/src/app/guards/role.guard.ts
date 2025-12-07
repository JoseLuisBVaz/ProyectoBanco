import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowed: string[] = route.data['roles'] || [];
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) {
        return this.router.parseUrl('/login');
      }
      const user = JSON.parse(raw);
      const rol = String(user?.rol || user?.role || '').toLowerCase().trim();
      if (rol === 'm' || rol.startsWith('m')) {
        if (allowed.includes('e') || allowed.includes('m')) return true;
      }
      if (allowed.includes(rol)) return true;
      return this.router.parseUrl('/login');
    } catch (e) {
      return this.router.parseUrl('/login');
    }
  }
}
