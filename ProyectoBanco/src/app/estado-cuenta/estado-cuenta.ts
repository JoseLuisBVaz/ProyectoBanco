import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { UsuariosService } from '../services/usuarios.service';
import { TransferService } from '../services/transfer.service';
import { FormsModule } from '@angular/forms';
import { InactivityService } from '../services/inactivity.service';

interface Movement {
  type: 'transfer_out' | 'transfer_in' | 'deposit' | 'withdrawal';
  id: number;
  date: string;
  amount: number;
  fee: number;
  description: string;
  destiny?: string;
  origin?: string;
  balance: number;
}

@Component({
  selector: 'app-estado-cuenta',
  imports: [CommonModule, Navbar, FormsModule],
  templateUrl: './estado-cuenta.html',
  styleUrl: './estado-cuenta.css'
})
export class EstadoCuenta implements OnInit, OnDestroy {
  private isBrowser: boolean;
  
  userName: string = '';
  accounts: any[] = [];
  selectedAccount: any | null = null;
  accountInfo: any | null = null;
  movements: Movement[] = [];
  filteredMovements: Movement[] = [];
  
  isLoading = false;
  isSendingEmail = false;
  errorMsg = '';
  showAccountSelector = false;
  
  filterType: string = 'all';
  filterDateFrom: string = '';
  filterDateTo: string = '';
  searchText: string = '';
  
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  cardStyle: { [k: string]: string } = {};

  constructor(
    private loginService: LoginService,
    private usuariosService: UsuariosService,
    private transferService: TransferService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private inactivityService: InactivityService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.inactivityService.startWatching();
    
    if (!this.isBrowser) return;

    const cached = this.loginService.getCurrentUser();
    if (cached) {
      const displayName = cached?.firstName
        ? `${cached.firstName} ${cached.lastNameP ?? ''}`.trim()
        : 'Cliente';
      this.userName = displayName;
      
      if (cached.mainId) {
        this.loadAccounts(cached.mainId);
      }
    }

    this.loginService.getCurrentUserProfile().subscribe((u: any) => {
      if (u) {
        const display = u?.firstName
          ? `${u.firstName} ${u.lastNameP ?? ''}`.trim()
          : 'Cliente';
        this.userName = display;
        
        if (u.mainId && this.accounts.length === 0) {
          this.loadAccounts(u.mainId);
        }
      }
    });
  }

  private loadAccounts(mainId: number) {
    this.usuariosService.getAccountsByUser(mainId).subscribe({
      next: (response: any) => {
        const list = response?.data || response?.accounts || (Array.isArray(response) ? response : []);
        
        const arr = list.map((a: any) => ({
          ...a,
          accountId: a.accountId,
          accNum: a.accNum ?? a.accountNumber,
          clabe: a.clabe ?? a.CLABE,
          cardNum: a.cardNum ?? a.cardNumber,
          balance: a.balance != null ? Number(a.balance) : 0,
          accType: a.accType ?? a.type
        }));
        
        this.accounts = arr;
        
        if (arr.length > 0) {
          this.selectAccount(arr[0]);
        }
        
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = 'No se pudieron cargar las cuentas';
        console.error('❌ [ESTADO-CUENTA] Error al cargar cuentas:', err);
      }
    });
  }

  selectAccount(account: any) {
    this.selectedAccount = account;
    this.cardStyle = this.getStyleFor(account);
    this.showAccountSelector = false;
    this.loadStatement(account.accountId);
  }

  toggleAccountSelector() {
    if (this.accounts.length > 1) {
      this.showAccountSelector = !this.showAccountSelector;
    }
  }

  private loadStatement(accountId: number) {
    this.isLoading = true;
    this.errorMsg = '';
    this.movements = [];
    this.filteredMovements = [];

    this.transferService.getAccountStatement(accountId).subscribe({
      next: (response) => {
        if (response.success) {
          this.accountInfo = response.accountInfo;
          this.movements = response.movements || [];
          this.applyFilters();
          this.isLoading = false;
          this.cdr.markForCheck();
        } else {
          this.errorMsg = response.msg || 'Error al obtener el estado de cuenta';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar el estado de cuenta';
        this.isLoading = false;
        console.error('[ESTADO-CUENTA] Error:', err);
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters() {
    let filtered = [...this.movements];

    if (this.filterType !== 'all') {
      filtered = filtered.filter(m => m.type === this.filterType);
    }

    if (this.filterDateFrom) {
      const fromDate = new Date(this.filterDateFrom);
      filtered = filtered.filter(m => new Date(m.date) >= fromDate);
    }

    if (this.filterDateTo) {
      const toDate = new Date(this.filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.date) <= toDate);
    }

    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(m => 
        m.description?.toLowerCase().includes(search) ||
        m.origin?.includes(search) ||
        m.destiny?.includes(search)
      );
    }

    this.filteredMovements = filtered;
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  resetFilters() {
    this.filterType = 'all';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.searchText = '';
    this.applyFilters();
  }

  get paginatedMovements(): Movement[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredMovements.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getMovementIcon(type: string): string {
    switch (type) {
      case 'transfer_out': return 'fa-arrow-up';
      case 'transfer_in': return 'fa-arrow-down';
      case 'deposit': return 'fa-piggy-bank';
      case 'withdrawal': return 'fa-money-bill-wave';
      default: return 'fa-exchange-alt';
    }
  }

  getMovementLabel(type: string): string {
    switch (type) {
      case 'transfer_out': return 'Transferencia enviada';
      case 'transfer_in': return 'Transferencia recibida';
      case 'deposit': return 'Depósito';
      case 'withdrawal': return 'Retiro sin tarjeta';
      default: return 'Movimiento';
    }
  }

  getMovementClass(type: string): string {
    switch (type) {
      case 'transfer_out': return 'negative';
      case 'transfer_in': return 'positive';
      case 'deposit': return 'positive';
      case 'withdrawal': return 'negative';
      default: return '';
    }
  }

  isNegative(type: string): boolean {
    return type === 'transfer_out' || type === 'withdrawal';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  maskCard(cardNum: string | null | undefined): string {
    if (!cardNum) return '****';
    const str = String(cardNum);
    if (str.length < 4) return str;
    return '•••• ' + str.slice(-4);
  }

  maskAcc(accNum: string | null | undefined): string {
    if (!accNum) return '****';
    const str = String(accNum);
    if (str.length < 4) return str;
    return '•••• ' + str.slice(-4);
  }

  sendStatementByEmail(): void {
    if (!this.selectedAccount) {
      this.errorMsg = 'No hay cuenta seleccionada';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }

    if (this.movements.length === 0) {
      this.errorMsg = 'No hay movimientos para enviar';
      setTimeout(() => this.errorMsg = '', 3000);
      return;
    }

    this.isSendingEmail = true;
    this.errorMsg = '';

    const url = `http://18.116.122.121:3000/api/usuarios/send-account-statement`;
    const body = { accountId: this.selectedAccount.accountId };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        this.isSendingEmail = false;
        alert('Estado de cuenta enviado por correo exitosamente. Revisa tu bandeja de entrada.');
      },
      error: (err) => {
        console.error('Error al enviar estado de cuenta por email:', err);
        this.isSendingEmail = false;
        this.errorMsg = err.error?.msg || 'Error al enviar el estado de cuenta por correo';
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  private getStyleFor(acc: any): { [k: string]: string } {
    const key = String(acc?.accNum || acc?.clabe || acc?.cardNum || 'x');
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

  private palettes = [
    'linear-gradient(135deg, #1a2aff 0%, #5b7dff 100%)',
    'linear-gradient(135deg, #5a189a 0%, #9c1de7 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #111827 0%, #374151 100%)'
  ];

  ngOnDestroy() {
    this.inactivityService.stopWatching();
  }
}
