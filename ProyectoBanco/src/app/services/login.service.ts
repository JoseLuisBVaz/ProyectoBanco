import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  login(mail: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { mail, password }).pipe(
      switchMap((res: any) => {
        if (res && res.success && res.user?.mainId) {
          // Intentar obtener el perfil completo inmediatamente para tener firstName/lastName
          const minimal = res.user;
          return this.http.get(`${this.apiUrl}/usuario/${minimal.mainId}`).pipe(
            map((profile: any) => {
              const normalized = {
                mainId: profile?.mainId ?? minimal.mainId,
                mail: profile?.mail ?? minimal.mail,
                rol: profile?.rol ?? minimal.rol,
                firstName: profile?.firstName ?? null,
                lastNameP: profile?.lastNameP ?? null,
                lastNameM: profile?.lastNameM ?? null,
                phoneNumber: profile?.phoneNumber ?? null,
                birthday: profile?.birthday ?? null,
                address: profile?.address ?? null,
                curp: profile?.curp ?? null,
                rfc: profile?.rfc ?? null,
                nss: profile?.nss ?? null
              };
              try {
                localStorage.setItem('currentUser', JSON.stringify({ ...minimal, ...normalized }));
              } catch (e) {
                console.warn('Could not persist merged user in localStorage', e);
              }
              return res; // propagamos la respuesta original
            }),
            catchError((err) => {
              // Si falla el perfil, guardamos al menos el user mínimo
              try {
                localStorage.setItem('currentUser', JSON.stringify(minimal));
              } catch {}
              return of(res);
            })
          );
        }
        // Caso sin mainId: guardamos lo que haya
        if (res && res.success) {
          try {
            localStorage.setItem('currentUser', JSON.stringify(res.user || { mail, rol: res.rol }));
          } catch {}
        }
        return of(res);
      })
    );
  }

  getCurrentUser(): any {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Obtiene el perfil del usuario actual.
   * - Lee el usuario del localStorage (establecido en login).
   * - Si existe un mainId, consulta el backend `/api/usuario/:id` para obtener los datos completos.
   * - Normaliza la respuesta para exponer propiedades comunes como firstName, lastNameP, etc.
   * - En caso de error, devuelve el objeto mínimo del localStorage.
   */
  getCurrentUserProfile(): Observable<any> {
    const cached = this.getCurrentUser();
    if (!cached || !cached.mainId) {
      // Sin sesión o sin id -> devolvemos lo que tengamos
      return of(cached);
    }
    return this.http.get(`${this.apiUrl}/usuario/${cached.mainId}`).pipe(
      map((profile: any) => {
        // Normalizar campos por si el backend aún no los unifica
        const normalized = {
          mainId: profile?.mainId ?? cached.mainId,
          mail: profile?.mail ?? cached.mail,
          rol: profile?.rol ?? cached.rol,
          firstName: profile?.firstName ?? profile?.customerName ?? profile?.employeeName ?? null,
          lastNameP: profile?.lastNameP ?? null,
          lastNameM: profile?.lastNameM ?? null,
          phoneNumber: profile?.phoneNumber ?? null,
          birthday: profile?.birthday ?? null,
          address: profile?.address ?? null,
          curp: profile?.curp ?? null,
          rfc: profile?.rfc ?? profile?.customerRfc ?? profile?.employeeRfc ?? null,
          nss: profile?.nss ?? null
        };
        return { ...cached, ...normalized };
      }),
      catchError((err) => {
        console.warn('getCurrentUserProfile() error, fallback to cached user:', err);
        return of(cached);
      })
    );
  }

  logout() {
    try { localStorage.removeItem('currentUser'); } catch (e) { /* ignore */ }
  }
}
