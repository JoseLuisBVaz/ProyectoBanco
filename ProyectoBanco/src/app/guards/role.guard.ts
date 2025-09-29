import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowed: string[] = route.data['roles'] || [];
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) {
        this.router.navigate(['/login']);
        return false;
      }
      const user = JSON.parse(raw);
      const rol = String(user?.rol || user?.role || '').toLowerCase().trim();
      if (rol === 'm' || rol.startsWith('m')) {
        if (allowed.includes('e') || allowed.includes('m')) return true;
      }
      if (allowed.includes(rol)) return true;
      this.router.navigate(['/login']);
      return false;
    } catch (e) {
      console.warn('RoleGuard error:', e);
      this.router.navigate(['/login']);
      return false;
    }
  }
}
