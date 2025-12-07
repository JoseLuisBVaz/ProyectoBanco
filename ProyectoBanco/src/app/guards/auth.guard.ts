import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(): boolean | UrlTree {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    try {
      const raw = localStorage.getItem('currentUser');
      console.log('[AuthGuard] Verificando sesión, raw:', raw);
      
      if (!raw) {
        console.log('[AuthGuard] No hay currentUser en localStorage, redirigiendo a login');
        return this.router.parseUrl('/login');
      }
      const user = JSON.parse(raw);
      console.log('[AuthGuard] Usuario encontrado:', user);
      
      if (!user || (!user.mail && !user.mainId)) {
        console.log('[AuthGuard] Usuario inválido, redirigiendo a login');
        return this.router.parseUrl('/login');
      }
      console.log('[AuthGuard] Sesión válida, permitiendo acceso');
      return true;
    } catch (e) {
      console.error('[AuthGuard] Error al validar sesión:', e);
      return this.router.parseUrl('/login');
    }
  }
}
