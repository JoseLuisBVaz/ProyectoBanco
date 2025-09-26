import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  login(mail: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { mail, password }).pipe(
      tap((res: any) => {
        if (res && res.success) {
          // persist minimal user info
          try {
            localStorage.setItem('currentUser', JSON.stringify(res.user || { mail, rol: res.rol }));
          } catch (e) {
            console.warn('Could not persist user in localStorage', e);
          }
        }
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

  logout() {
    try { localStorage.removeItem('currentUser'); } catch (e) { /* ignore */ }
  }
}
