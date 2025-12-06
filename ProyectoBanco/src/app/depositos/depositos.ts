import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { UsuariosService } from '../services/usuarios.service';
import { TransferService } from '../services/transfer.service';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-depositos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './depositos.html',
  styleUrls: ['./depositos.css']
})
export class Depositos implements OnInit {
  depositForm: FormGroup;

  errorMsg = '';
  successMsg = '';
  passwordVisible = false;
  lastDepositId: number | null = null;
  showAccountSelector = false; // Para mostrar/ocultar el selector de cuentas

  userName: string | null = null;
  userId: number | null = null;
  userMail: string | null = null;
  accounts: any[] = [];
  selectedDestination: any | null = null;
  selectedCardStyle: { [k: string]: string} = {};
  private accountsRefreshed = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private usuariosService: UsuariosService,
    private transferService: TransferService
  ) {
    this.depositForm = this.fb.group({
      destino: [null as any, Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      descripcion: ['Depósito en efectivo', Validators.required],
      contrasena: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Cargar usuario cacheado y pintar cuentas inmediatamente si existen en cache
    const cachedUser = this.loginService.getCurrentUser();
    if (cachedUser) {
      this.userId = cachedUser.mainId ?? null;
      this.userMail = cachedUser.mail ?? null;
      const nameParts = [cachedUser.firstName, cachedUser.lastNameP, cachedUser.lastNameM]
        .filter(Boolean)
        .join(' ');
      this.userName = nameParts || cachedUser.mail || 'Cliente';
      this.loadCachedAccounts();
      if (this.userId != null) {
        this.fetchAccountsFromServer(this.userId);
      }
    }

    // Actualizar perfil desde backend
    this.loginService.getCurrentUserProfile().subscribe((profile) => {
      if (!profile) return;
      const prevUserId = this.userId;
      this.userId = profile.mainId ?? this.userId;
      this.userMail = profile.mail ?? this.userMail;
      const nameParts = [profile.firstName, profile.lastNameP, profile.lastNameM]
        .filter(Boolean)
        .join(' ');
      this.userName = nameParts || profile.mail || this.userName || 'Cliente';
      if (this.userId != null && (!this.accountsRefreshed || prevUserId !== this.userId)) {
        this.fetchAccountsFromServer(this.userId);
      }
    });
  }

  enviarDeposito() {
    const { destino, monto, descripcion, contrasena } = this.depositForm.value;

    this.errorMsg = '';
    this.successMsg = '';

    if (!destino || !monto || !descripcion || !contrasena) {
      this.errorMsg = 'Debes completar todos los campos.';
      return;
    }

    // Validar credenciales contra backend antes de depositar
    if (!this.userMail || !this.userId) {
      this.errorMsg = 'Sesión no válida. Vuelve a iniciar sesión.';
      return;
    }

    const payload = {
      mainId: this.userId,
      amount: Number(monto),
      description: descripcion || 'Depósito en efectivo'
    };

    this.loginService.login(this.userMail, contrasena).subscribe({
      next: (loginRes) => {
        if (!loginRes || !loginRes.success) {
          this.errorMsg = 'Contraseña incorrecta.';
          this.successMsg = '';
          return;
        }
        
        // Realizar el depósito
        this.transferService.deposit(payload).subscribe({
          next: (res) => {
            this.lastDepositId = res?.depId || null;
            const newBalance = Number(res?.newBalance ?? 0);
            this.successMsg = `¡Depósito realizado con éxito! Nuevo saldo: $${newBalance.toFixed(2)}`;
            this.errorMsg = '';

            // Actualizar balance en la cuenta seleccionada
            if (this.selectedDestination) {
              this.selectedDestination.balance = newBalance;
              
              // Actualizar también en el array de cuentas
              const accountIndex = this.accounts.findIndex(
                acc => acc.accountId === this.selectedDestination.accountId
              );
              if (accountIndex !== -1) {
                this.accounts[accountIndex].balance = newBalance;
                // Actualizar cache
                if (this.userId) {
                  this.cacheAccounts(this.userId, this.accounts);
                }
              }
              
              // Forzar actualización del formulario
              this.depositForm.patchValue({ 
                destino: this.selectedDestination 
              }, { emitEvent: false });
            }

            // Limpiar campos
            this.depositForm.patchValue({ 
              monto: 0, 
              descripcion: 'Depósito en efectivo', 
              contrasena: '' 
            });
            this.passwordVisible = false;

            // Refrescar desde backend usando el userId (doble verificación)
            if (this.userId) {
              setTimeout(() => {
                this.fetchAccountsFromServer(this.userId!);
              }, 500);
            }
          },
          error: (err: any) => {
            const msg = err?.error?.msg || 'No se pudo realizar el depósito';
            this.errorMsg = msg;
            this.successMsg = '';
          }
        });
      },
      error: () => {
        this.errorMsg = 'Contraseña incorrecta.';
        this.successMsg = '';
      }
    });
  }

  cancelarDeposito() {
    this.depositForm.reset({ 
      monto: 0, 
      descripcion: 'Depósito en efectivo' 
    });
    this.errorMsg = '';
    this.successMsg = '';
  }

  togglePassword() { 
    this.passwordVisible = !this.passwordVisible; 
  }

  onDestinationChange() {
    this.selectedDestination = this.depositForm.value.destino;
    if (this.selectedDestination) {
      this.selectedCardStyle = this.getStyleFor(this.selectedDestination);
      if (this.userId != null) {
        const key = this.cacheKeyForSelection(this.userId);
        const sel = String(this.selectedDestination.accNum || this.selectedDestination.clabe || '');
        try { localStorage.setItem(key, sel); } catch {}
      }
    } else {
      this.selectedCardStyle = {};
    }
  }

  // ==================== CARGA Y GESTIÓN DE CUENTAS ====================

  private loadCachedAccounts() {
    if (!this.userId) return;
    const cacheKey = this.cacheKeyForAccounts(this.userId);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this.accounts = JSON.parse(cached) || [];
        this.restoreSelectedDestination();
      }
    } catch {}
  }

  private fetchAccountsFromServer(userId: number) {
    this.usuariosService.getAccountsByUser(userId).subscribe({
      next: (response: any) => {
        const data = response?.data || response?.accounts || (Array.isArray(response) ? response : []);
        this.accounts = data;
        this.accountsRefreshed = true;
        this.cacheAccounts(userId, this.accounts);
        
        if (this.selectedDestination) {
          const updated = this.accounts.find(
            acc => acc.accountId === this.selectedDestination.accountId
          );
          if (updated) {
            this.selectedDestination = updated;
            this.depositForm.patchValue({ destino: updated }, { emitEvent: false });
            this.selectedCardStyle = this.getStyleFor(updated);
          }
        } else {
          this.restoreSelectedDestination();
        }
      },
      error: () => {
        this.accounts = [];
      }
    });
  }

  private cacheAccounts(userId: number, accounts: any[]) {
    const key = this.cacheKeyForAccounts(userId);
    try {
      localStorage.setItem(key, JSON.stringify(accounts));
    } catch {}
  }

  private restoreSelectedDestination() {
    if (!this.userId || this.accounts.length === 0) return;
    const key = this.cacheKeyForSelection(this.userId);
    try {
      const prev = localStorage.getItem(key);
      if (prev) {
        const found = this.accounts.find(a => String(a.accNum) === prev || String(a.clabe) === prev);
        if (found) {
          this.depositForm.patchValue({ destino: found }, { emitEvent: false });
          this.selectedDestination = found;
          this.selectedCardStyle = this.getStyleFor(found);
          return;
        }
      }
    } catch {}
    // Si no hay selección previa, seleccionar la primera
    if (this.accounts.length > 0 && !this.selectedDestination) {
      const first = this.accounts[0];
      this.depositForm.patchValue({ destino: first }, { emitEvent: false });
      this.selectedDestination = first;
      this.selectedCardStyle = this.getStyleFor(first);
    }
  }

  private refreshAccountsAndReselect(accountKey: string) {
    if (!this.userId) return;
    this.usuariosService.getAccountsByUser(this.userId).subscribe({
      next: (data) => {
        this.accounts = Array.isArray(data) ? data : [];
        this.cacheAccounts(this.userId!, this.accounts);
        const match = this.accounts.find(a => 
          String(a.accNum) === accountKey || String(a.clabe) === accountKey
        );
        if (match) {
          this.depositForm.patchValue({ destino: match }, { emitEvent: false });
          this.selectedDestination = match;
          this.selectedCardStyle = this.getStyleFor(match);
        }
      }
    });
  }

  private cacheKeyForAccounts(userId: number): string {
    return `banco_jety_accounts_${userId}`;
  }

  private cacheKeyForSelection(userId: number): string {
    return `banco_jety_deposit_dest_${userId}`;
  }

  // ==================== ESTILOS DE TARJETA ====================

  private palettes: string[] = [
    'linear-gradient(135deg, #1a2aff 0%, #5b7dff 100%)',
    'linear-gradient(135deg, #5a189a 0%, #9c1de7 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #111827 0%, #374151 100%)'
  ];

  getStyleFor(acc: any): { [k: string]: string } {
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

  // ==================== MÁSCARAS ====================

  maskAcc(acc?: string): string {
    if (!acc) return '';
    const s = String(acc);
    return s.length > 6 ? '****' + s.slice(-4) : s;
  }

  maskCard(card?: string): string {
    if (!card) return '';
    const s = String(card);
    return s.length > 8 ? '**** **** **** ' + s.slice(-4) : s;
  }

  toggleAccountSelector() {
    if (this.accounts.length > 1) {
      this.showAccountSelector = !this.showAccountSelector;
    }
  }

  selectDestinationAccount(acc: any) {
    this.selectedDestination = acc;
    this.depositForm.patchValue({ destino: acc });
    this.selectedCardStyle = this.getStyleFor(acc);
    this.showAccountSelector = false;
  }

  // ==================== DESCARGAR PDF ====================

  downloadPDF() {
    if (!this.lastDepositId) {
      this.errorMsg = 'No hay comprobante disponible';
      return;
    }
    
    const url = `http://localhost:3000/api/usuarios/deposit-pdf/${this.lastDepositId}`;
    window.open(url, '_blank');
  }
}
