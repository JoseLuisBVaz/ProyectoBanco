import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';
import { InactivityService } from '../services/inactivity.service';

interface UserData {
  mainId: number;
  firstName: string;
  lastNameP: string;
  lastNameM: string;
  birthday: string;
  address: string;
  mail: string;
  phoneNumber: string;
  curp: string;
  rfc: string;
  rol: string;
  enterDate: string;
}

interface Account {
  accountId: number;
  cardNum: string;
  balance: number;
  accNum: string;
  accType: string;
}

interface Movement {
  tipo: string;
  cuenta: string;
  destino?: string;
  monto: number;
  comision: number;
  descripcion: string;
  fecha: string;
}

@Component({
  selector: 'app-detalles-cuenta',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './user.html',
  styleUrls: ['./user.css']
})
export class DetallesCuenta implements OnInit, OnDestroy {
  userData: UserData | null = null;
  accounts: Account[] = [];
  movements: any[] = [];
  loading = true;
  errorMsg = '';
  totalBalance = 0;
  selectedAccount: Account | null = null;
  hasDebts = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private inactivityService: InactivityService
  ) {}

  ngOnInit() {
    this.inactivityService.startWatching();
    this.loadUserData();
  }

  private loadUserData() {
    const userStr = localStorage.getItem('currentUser');
    console.log('[User] currentUser en localStorage:', userStr);
    
    if (!userStr) {
      this.errorMsg = 'No hay sesión activa';
      this.loading = false;
      console.log('[User] No hay sesión, mostrando error');
      return;
    }

    const user = JSON.parse(userStr);
    const mainId = user.mainId;
    console.log('[User] mainId extraído:', mainId);

    this.loadUserInfo(mainId);
    this.loadAccounts(mainId);
    this.loadMovements(mainId);
  }

  private loadUserInfo(mainId: number) {
    console.log('[User] Cargando info de usuario para mainId:', mainId);
    this.http.get<any>(`http://18.116.122.121:3000/api/usuarios/user-info/${mainId}`).subscribe({
      next: (response) => {
        console.log('[User] Response de user-info:', response);
        if (response.success) {
          this.userData = response.data;
          console.log('[User] userData cargada:', this.userData);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[User] Error al cargar datos de usuario:', err);
        this.errorMsg = 'Error al cargar información del usuario';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadAccounts(mainId: number) {
    console.log('[User] Cargando cuentas para mainId:', mainId);
    this.http.get<any>(`http://18.116.122.121:3000/api/usuarios/accounts/${mainId}`).subscribe({
      next: (response) => {
        console.log('[User] Response de cuentas:', response);
        if (response.success && response.data) {
          this.accounts = response.data;
          console.log('[User] Cuentas cargadas:', this.accounts);
          this.totalBalance = this.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
          console.log('[User] Balance total:', this.totalBalance);
          this.selectedAccount = this.accounts[0] || null;
          this.hasDebts = this.accounts.some(acc => Number(acc.balance) < 0);
        } else {
          console.log('[User] No se encontraron cuentas o respuesta inválida');
          this.accounts = [];
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[User] Error al cargar cuentas:', err);
        this.accounts = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadMovements(mainId: number) {
    this.http.get<any>(`http://18.116.122.121:3000/api/usuarios/movements/${mainId}`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.movements = response.data.map((mov: Movement) => ({
            date: mov.fecha,
            description: mov.descripcion || 'Sin descripción',
            type: this.getMovementType(mov.tipo),
            amount: Number(mov.monto)
          }));
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar movimientos:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getMovementType(tipo: string): string {
    if (tipo.includes('Depósito')) return 'deposit';
    if (tipo.includes('Retiro')) return 'withdrawal';
    if (tipo.includes('Transferencia') || tipo.includes('Disposición')) return 'transfer';
    return 'transfer';
  }

  maskCard(cardNum: string): string {
    if (!cardNum || cardNum.length < 4) return '•••• •••• •••• ••••';
    return `•••• •••• •••• ${cardNum.slice(-4)}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  ngOnDestroy() {
    this.inactivityService.stopWatching();
  }
}

