import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = 'http://localhost:3000/api/usuarios';

  constructor(private http: HttpClient) {}

  getMain(): Observable<any> {
    return this.http.get(`${this.apiUrl}/main`);
  }

  getCustomers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/customers`);
  }

  getEmployees(): Observable<any> {
    return this.http.get(`${this.apiUrl}/employees`);
  }

  getUsuario(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuario/${id}`);
  }

  getAccountsByUser(mainId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accounts/${mainId}`);
  }

  // Obtener cuentas del usuario (alias para compatibilidad)
  getCuentas(mainId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/accounts/${mainId}`);
  }

  // Crear retiro sin tarjeta
  crearRetiroSinTarjeta(retiroData: {
    mainId: number;
    accNum: string;
    amount: number;
    description: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/retiro-sin-tarjeta`, retiroData);
  }

  // Obtener retiros recientes del usuario
  getRetirosRecientes(mainId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/retiros-recientes/${mainId}`);
  }

  // Validar código de retiro
  validarCodigoRetiro(codigo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validar-codigo-retiro`, { codigo });
  }

  // Procesar retiro con código
  procesarRetiroConCodigo(codigo: string, empleadoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/procesar-retiro-codigo`, { codigo, empleadoId });
  }
}
