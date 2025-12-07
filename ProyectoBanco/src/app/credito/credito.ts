import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { InactivityService } from '../services/inactivity.service';

interface Account {
  accountId: number;
  accNum: string;
  clabe: string;
  cardNum: string;
  balance: number;
  accType: string;
}

interface CreditInfo {
  accountId: number;
  accNum: string;
  clabe: string;
  cardNum: string;
  creditLimit: number;
  used: number;
  available: number;
  usedPercentage: number;
  balance: number;
}

interface Disposal {
  disposalId: number;
  accountId: number;
  amount: number;
  description: string;
  date: string;
  availableAfter: number;
}

@Component({
  selector: 'app-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './credito.html',
  styleUrl: './credito.css'
})
export class Credito implements OnInit, OnDestroy {
  accounts: Account[] = [];
  creditAccounts: Account[] = [];
  selectedAccount: Account | null = null;
  selectedAccountId: number = 0;
  creditInfo: CreditInfo | null = null;
  
  disposeAmount: number = 0;
  disposeDescription: string = '';
  
  disposals: Disposal[] = [];
  filteredDisposals: Disposal[] = [];
  
  showAccountSelector: boolean = false;
  isLoading: boolean = false;
  isDisposing: boolean = false;
  isSendingEmail: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';
  
  cardStyle: any = {};
  
  private palettes: string[] = [
    'linear-gradient(135deg, #1a2aff 0%, #5b7dff 100%)',
    'linear-gradient(135deg, #5a189a 0%, #9c1de7 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #111827 0%, #374151 100%)'
  ];
  
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private inactivityService: InactivityService
  ) {}
  
  ngOnInit(): void {
    this.inactivityService.startWatching();
    
    const currentUserRaw = localStorage.getItem('currentUser');
    
    if (!currentUserRaw) {
      this.router.navigate(['/login']);
      return;
    }
    
    try {
      const currentUser = JSON.parse(currentUserRaw);
      const mainId = currentUser.mainId;
      
      if (!mainId) {
        this.router.navigate(['/login']);
        return;
      }
      
      localStorage.setItem('mainId', mainId.toString());
      this.loadCreditAccounts();
    } catch (e) {
      this.router.navigate(['/login']);
    }
  }
  
  loadCreditAccounts(): void {
    const mainId = localStorage.getItem('mainId');
    
    if (!mainId) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Solo mostrar loading en la carga inicial
    if (this.creditAccounts.length === 0) {
      this.isLoading = true;
    }
    this.errorMsg = '';
    
    this.http.get<any>(`http://localhost:3000/api/usuarios/accounts/${mainId}`).subscribe(
      response => {
        console.log('Response completo:', response);
        
        // Asegurar que accounts sea un array
        const accountsData = response.data || response;
        this.accounts = Array.isArray(accountsData) ? accountsData : [];
        
        console.log('Accounts después de asignar:', this.accounts);
        console.log('Tipos de cuenta:', this.accounts.map(acc => acc.accType));
        
        this.creditAccounts = this.accounts.filter(acc => 
          acc.accType && acc.accType.toLowerCase() === 'credito'
        );
        console.log('Credit accounts filtradas:', this.creditAccounts);
        console.log('Número de cuentas de crédito:', this.creditAccounts.length);
        
        // Quitar loading inmediatamente
        this.isLoading = false;
        
        if (this.creditAccounts.length === 0) {
          this.errorMsg = 'No tienes cuentas de crédito disponibles. Contacta al banco para solicitar una línea de crédito.';
          this.cdr.detectChanges();
          return;
        }
        
        // Si no hay cuenta seleccionada, seleccionar la primera
        if (!this.selectedAccount) {
          this.selectedAccount = this.creditAccounts[0];
          this.selectedAccountId = this.selectedAccount.accountId;
          console.log('Cuenta seleccionada:', this.selectedAccount);
          this.cardStyle = this.getStyleFor(this.selectedAccount);
        } else {
          // Actualizar la cuenta seleccionada con los nuevos datos
          const updated = this.creditAccounts.find(acc => acc.accountId === this.selectedAccount!.accountId);
          if (updated) {
            this.selectedAccount = updated;
          }
        }
        
        // Forzar detección de cambios para actualizar la vista
        this.cdr.detectChanges();
        
        // Cargar info adicional sin bloquear la UI
        this.loadCreditInfo();
        this.loadHistory();
      },
      error => {
        console.error('Error al cargar cuentas:', error);
        this.errorMsg = 'Error al cargar las cuentas. Por favor intenta de nuevo.';
        this.isLoading = false;
      }
    );
  }
  
  loadCreditInfo(): void {
    if (!this.selectedAccount) {
      console.log('No hay cuenta seleccionada para cargar info');
      return;
    }
    
    console.log('Cargando info de crédito para accountId:', this.selectedAccount.accountId);
    
    this.http.get<any>(`http://localhost:3000/api/usuarios/credit-info/${this.selectedAccount.accountId}`).subscribe(
      response => {
        console.log('Response de credit-info:', response);
        if (response.success && response.creditInfo) {
          this.creditInfo = response.creditInfo;
          console.log('CreditInfo cargada:', this.creditInfo);
          // Forzar detección de cambios
          this.cdr.detectChanges();
        } else {
          console.log('No se encontró creditInfo en la respuesta');
        }
      },
      error => {
        console.error('Error al cargar información de crédito:', error);
        console.error('Status:', error.status);
        console.error('Message:', error.message);
      }
    );
  }
  
  loadHistory(): void {
    if (!this.selectedAccount) return;
    
    this.http.get<any>(`http://localhost:3000/api/usuarios/credit-history/${this.selectedAccount.accountId}`).subscribe(
      response => {
        if (response.success && response.disposals) {
          this.disposals = response.disposals;
          this.filteredDisposals = [...this.disposals];
        } else {
          this.disposals = [];
          this.filteredDisposals = [];
        }
      },
      error => {
        console.error('Error al cargar historial:', error);
        this.disposals = [];
        this.filteredDisposals = [];
      }
    );
  }
  
  disposeCredit(): void {
    if (!this.selectedAccount || !this.creditInfo) return;
    
    this.errorMsg = '';
    this.successMsg = '';
    
    if (!this.disposeAmount || this.disposeAmount <= 0) {
      this.errorMsg = 'Ingresa un monto válido mayor a 0';
      return;
    }
    
    if (this.disposeAmount > this.creditInfo.available) {
      this.errorMsg = `El monto excede tu crédito disponible ($${this.creditInfo.available.toFixed(2)})`;
      return;
    }
    
    this.isDisposing = true;
    this.errorMsg = '';
    this.successMsg = '';
    
    const data = {
      accountId: this.selectedAccount.accountId,
      amount: this.disposeAmount,
      description: this.disposeDescription || 'Préstamo de crédito'
    };
    
    this.http.post<any>('http://localhost:3000/api/usuarios/dispose-credit', data).subscribe(
      response => {
        if (response.success) {
          this.successMsg = `Préstamo exitoso de $${this.disposeAmount.toFixed(2)}`;
          this.disposeAmount = 0;
          this.disposeDescription = '';
          
          // Actualizar el balance de la cuenta seleccionada localmente
          if (this.selectedAccount) {
            this.selectedAccount.balance += data.amount;
          }
          
          // Actualizar solo la información de crédito sin recargar todo
          this.loadCreditInfo();
          this.loadHistory();
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          // Limpiar mensaje de éxito después de 5 segundos
          setTimeout(() => {
            this.successMsg = '';
            this.cdr.detectChanges();
          }, 5000);
        }
        this.isDisposing = false;
      },
      error => {
        console.error('Error al realizar préstamo:', error);
        this.errorMsg = error.error?.msg || 'Error al realizar el préstamo';
        this.isDisposing = false;
        this.cdr.detectChanges();
      }
    );
  }

  onCreditAccountChange(): void {
    const account = this.creditAccounts.find(acc => acc.accountId === this.selectedAccountId);
    if (account) {
      this.selectedAccount = account;
      this.cardStyle = this.getStyleFor(account);
      this.errorMsg = '';
      this.successMsg = '';
      this.loadCreditInfo();
      this.loadHistory();
    }
  }
  
  selectAccount(acc: Account): void {
    this.selectedAccount = acc;
    this.selectedAccountId = acc.accountId;
    this.cardStyle = this.getStyleFor(acc);
    this.showAccountSelector = false;
    this.errorMsg = '';
    this.successMsg = '';
    
    // No usar isLoading aquí, cargar la info en segundo plano
    this.loadCreditInfo();
    this.loadHistory();
  }
  
  toggleAccountSelector(): void {
    if (this.creditAccounts.length > 1) {
      this.showAccountSelector = !this.showAccountSelector;
    }
  }
  
  maskCard(cardNum: string): string {
    if (!cardNum) return '';
    const cleaned = cardNum.replace(/\s/g, '');
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  
  maskAcc(accNum: string): string {
    if (!accNum || accNum.length < 4) return accNum;
    return '**** ' + accNum.slice(-4);
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  sendHistoryByEmail(): void {
    if (!this.selectedAccount) {
      this.errorMsg = 'No hay cuenta seleccionada';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    
    if (this.disposals.length === 0) {
      this.errorMsg = 'No hay disposiciones para enviar';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }
    
    this.isSendingEmail = true;
    this.errorMsg = '';
    this.successMsg = '';
    
    const url = `http://localhost:3000/api/usuarios/send-credit-history`;
    const body = { accountId: this.selectedAccount.accountId };
    
    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        console.log('✅ Historial enviado por email:', response);
        this.isSendingEmail = false;
        this.successMsg = response.msg || 'Historial enviado por correo exitosamente';
        setTimeout(() => this.successMsg = '', 5000);
      },
      error: (err) => {
        console.error('❌ Error al enviar historial por email:', err);
        this.isSendingEmail = false;
        this.errorMsg = err.error?.msg || 'Error al enviar el historial por correo';
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }
  
  get paginatedDisposals(): Disposal[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredDisposals.slice(start, end);
  }
  
  get totalPages(): number {
    return Math.ceil(this.filteredDisposals.length / this.itemsPerPage);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPaymentDueDate(): string {
    // Calcular fecha límite: último día del mes actual
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  getMinimumPayment(): number {
    if (!this.creditInfo || this.creditInfo.used <= 0) {
      return 0;
    }
    // Pago mínimo: 10% del total adeudado o $100, lo que sea mayor
    const tenPercent = this.creditInfo.used * 0.10;
    return Math.max(tenPercent, 100);
  }
  
  private getStyleFor(acc: Account): { [k: string]: string } {
    const key = String(acc.accNum || acc.clabe || acc.cardNum || 'x');
    const idx = this.hashString(key) % this.palettes.length;
    return { background: this.palettes[idx], color: '#ffffff' };
  }
  
  private hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  ngOnDestroy() {
    this.inactivityService.stopWatching();
  }
}
