import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) {
        this.router.navigate(['/login']);
        return false;
      }
      const user = JSON.parse(raw);
      if (!user || !user.mail) {
        this.router.navigate(['/login']);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('AuthGuard parse error:', e);
      this.router.navigate(['/login']);
      return false;
    }
  }
}
