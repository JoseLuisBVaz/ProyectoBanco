import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Debe coincidir con la lógica del SP: 5 por cada 100 y 10 por cada 1500 (tramos completos)
  estimateFee(amount: number): number {
    if (!amount || amount <= 0) return 0;
    const part100 = Math.floor(amount / 100) * 5;
    const part1500 = Math.floor(amount / 1500) * 10;
    return part100 + part1500;
  }

  transfer(params: { origin: string; destiny: string; amount: number; description?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/transfer`, params);
  }
}
