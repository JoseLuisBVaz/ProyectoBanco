import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { UsuariosService } from '../services/usuarios.service';
import { TransferService } from '../services/transfer.service';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './transfers.html',
  styleUrls: ['./transfers.css']
})
export class Transfers implements OnInit {
  transferForm: FormGroup;

  errorMsg = '';
  successMsg = '';
  passwordVisible = false;
  confirmPasswordVisible = false;
  lastTransferId: number | null = null; // 🆕 Guardar el ID de la última transferencia
  showAccountSelector = false; // Para mostrar/ocultar el selector de cuentas

  userName: string | null = null;
  userId: number | null = null;
  userMail: string | null = null;
  accounts: any[] = [];
  selectedOrigin: any | null = null;
  selectedCardStyle: { [k: string]: string } = {};
  private accountsRefreshed = false; // evita dobles cargas

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private usuariosService: UsuariosService,
    private transferService: TransferService
  ) {
    this.transferForm = this.fb.group({
      origen: [null as any, Validators.required],
      destino: ['', [Validators.required, Validators.minLength(10)]],
      beneficiario: ['', Validators.required],
      referencia: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      contrasena: ['', Validators.required],
      contrasena2: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // 1) Cargar usuario cacheado y pintar cuentas inmediatamente si existen en cache
    const cachedUser = this.loginService.getCurrentUser();
    if (cachedUser) {
      this.userId = cachedUser.mainId ?? null;
      this.userMail = cachedUser.mail ?? null;
      const nameParts = [cachedUser.firstName, cachedUser.lastNameP, cachedUser.lastNameM]
        .filter(Boolean)
        .join(' ');
      this.userName = nameParts || cachedUser.mail || 'Cliente';
      this.loadCachedAccounts(); // muestra al instante si hay cache local
      if (this.userId != null) {
        this.fetchAccountsFromServer(this.userId); // refresco en background
      }
    }

    // 2) Actualizar perfil desde backend (sin bloquear la carga previa)
    this.loginService.getCurrentUserProfile().subscribe((profile) => {
      if (!profile) return;
      const prevUserId = this.userId;
      this.userId = profile.mainId ?? this.userId;
      this.userMail = profile.mail ?? this.userMail;
      const nameParts = [profile.firstName, profile.lastNameP, profile.lastNameM]
        .filter(Boolean)
        .join(' ');
      this.userName = nameParts || profile.mail || this.userName || 'Cliente';
      // Si no hemos refrescado aún o el id cambió, refrescar
      if (this.userId != null && (!this.accountsRefreshed || prevUserId !== this.userId)) {
        this.fetchAccountsFromServer(this.userId);
      }
    });
  }

  enviarTransferencia() {
    const { origen, destino, beneficiario, referencia, monto, contrasena, contrasena2 } = this.transferForm.value;

    this.errorMsg = '';
    this.successMsg = '';

    if (!origen || !destino || !beneficiario || !referencia || !monto || !contrasena || !contrasena2) {
      this.errorMsg = 'Debes completar todos los campos.';
      return;
    }
    if (contrasena !== contrasena2) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }
    if (String(destino).length < 10) {
      this.errorMsg = 'La cuenta/CLABE destino debe tener al menos 10 dígitos.';
      return;
    }
    {
      const destStr = String(destino).trim();
      const acc = origen as any;
      if ((acc?.accNum && destStr === String(acc.accNum)) || (acc?.clabe && destStr === String(acc.clabe))) {
        this.errorMsg = 'La cuenta origen y destino no pueden ser la misma.';
        return;
      }
    }
    // Validar credenciales contra backend antes de transferir
    if (!this.userMail) {
      this.errorMsg = 'Sesión no válida. Vuelve a iniciar sesión.';
      return;
    }

    // Preparar payload de transferencia (aún no enviar)
    const originStr = String((origen?.accNum || origen?.clabe || '')).trim();
    const payload = {
      origin: originStr,
      destiny: String(destino).trim(),
      amount: Number(monto),
      description: referencia || null
    };

    // Primero login (verificación de contraseña), luego transfer
    this.loginService.login(this.userMail, contrasena).subscribe({
      next: (loginRes) => {
        if (!loginRes || !loginRes.success) {
          this.errorMsg = 'Contraseña incorrecta.';
          this.successMsg = '';
          return;
        }
        this.transferService.transfer(payload).subscribe({
          next: (res) => {
            const fee = Number(res?.fee ?? this.estimatedFee ?? 0);
            this.lastTransferId = res?.tranId || null; // 🆕 Guardar tranId
            this.successMsg = '¡Transferencia enviada con éxito!' + (fee ? ` (Comisión: $${fee})` : '');
            this.errorMsg = '';

            // Optimistic UI: descontar del saldo de origen y refrescar desde backend
            const acc = this.selectedOrigin;
            const amt = Number(monto) || 0;
            if (acc && typeof acc.balance === 'number') {
              acc.balance = Math.max(0, Number(acc.balance) - (amt + fee));
            }
            // Limpiar campos del destino y confirmación, conservar origen
            this.transferForm.patchValue({ destino: '', beneficiario: '', referencia: '', monto: 0, contrasena: '', contrasena2: '' });
            this.passwordVisible = false;
            this.confirmPasswordVisible = false;

            // Refrescar desde backend para balance real y consistencia
            const originKey = originStr;
            this.refreshAccountsAndReselect(originKey);
          },
          error: (err) => {
            const msg = err?.error?.msg || 'No se pudo realizar la transferencia';
            this.errorMsg = msg;
            this.successMsg = '';
            this.lastTransferId = null;
          }
        });
      },
      error: () => {
        this.errorMsg = 'Contraseña incorrecta.';
        this.successMsg = '';
      }
    });
  }

  cancelarTransferencia() {
    this.transferForm.reset({ monto: 0 });
    this.errorMsg = '';
    this.successMsg = '';
  }

  togglePassword() { this.passwordVisible = !this.passwordVisible; }
  toggleConfirmPassword() { this.confirmPasswordVisible = !this.confirmPasswordVisible; }

  onOriginChange() {
    this.selectedOrigin = this.transferForm.value.origen;
    if (this.selectedOrigin) {
      this.selectedCardStyle = this.getStyleFor(this.selectedOrigin);
      // Persistir selección para restaurarla rápido
      if (this.userId != null) {
        const key = this.cacheKeyForSelection(this.userId);
        const sel = String(this.selectedOrigin.accNum || this.selectedOrigin.clabe || '');
        try { localStorage.setItem(key, sel); } catch {}
      }
    } else {
      this.selectedCardStyle = {};
    }
  }

  get estimatedFee(): number {
    const amount = Number(this.transferForm?.value?.monto || 0);
    return this.transferService.estimateFee(amount);
  }

  get totalToDebit(): number {
    const amount = Number(this.transferForm?.value?.monto || 0);
    return amount + this.estimatedFee;
  }

  get remainingBalance(): number | null {
    const acc = this.selectedOrigin;
    const hasBalance = acc && typeof acc.balance === 'number';
    const amount = Number(this.transferForm?.value?.monto || 0);
    if (!hasBalance || amount <= 0) return null;
    const rem = Number(acc.balance) - (amount + this.estimatedFee);
    return rem;
  }

  get insufficientFunds(): boolean {
    const rb = this.remainingBalance;
    return rb !== null && rb < 0;
  }

  private refreshAccountsAndReselect(originKey: string) {
    if (this.userId == null) return;
    this.fetchAccountsFromServer(this.userId, originKey);
  }

  // Helpers borrowed from Home for consistent display
  private palettes: string[] = [
    'linear-gradient(135deg, #1a2aff 0%, #5b7dff 100%)',
    'linear-gradient(135deg, #5a189a 0%, #9c1de7 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #111827 0%, #374151 100%)'
  ];

  private hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  private getStyleFor(acc: any): { [k: string]: string } {
    const key = String(acc?.accNum || acc?.clabe || acc?.cardNum || 'x');
    const idx = this.hashString(key) % this.palettes.length;
    return { background: this.palettes[idx], color: '#ffffff' };
  }

  maskCard(num?: string): string {
    if (!num) return '';
    const last4 = num.slice(-4);
    return `**** **** **** ${last4}`;
  }

  maskAcc(num?: string): string {
    if (!num) return '';
    const last4 = num.slice(-4);
    return `•••• ${last4}`;
  }

  toggleAccountSelector() {
    if (this.accounts.length > 1) {
      this.showAccountSelector = !this.showAccountSelector;
    }
  }

  selectOriginAccount(acc: any) {
    this.selectedOrigin = acc;
    this.transferForm.patchValue({ origen: acc });
    this.selectedCardStyle = this.getStyleFor(acc);
    this.showAccountSelector = false;
  }

  // ====== Cache helpers para carga instantánea ======
  private cacheKeyForAccounts(userId: number) { return `acc_cache_${userId}`; }
  private cacheKeyForSelection(userId: number) { return `acc_sel_key_${userId}`; }

  private mapAccounts(accs: any[]): any[] {
    return (accs || []).map((a: any) => ({
      ...a,
      accNum: a.accNum ?? a.accountNumber ?? a.number ?? a.accnum,
      clabe: a.clabe ?? a.CLABE ?? a.clabeNumber,
      cardNum: a.cardNum ?? a.cardNumber,
      balance: (a.balance != null ? Number(a.balance) : null),
      accType: a.accType ?? a.type
    }));
  }

  private loadCachedAccounts() {
    if (this.userId == null) return;
    try {
      const raw = localStorage.getItem(this.cacheKeyForAccounts(this.userId));
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (Array.isArray(cached) && cached.length) {
        this.accounts = this.mapAccounts(cached);
        // No confiar en saldos cacheados: mostrar null hasta refrescar desde backend
        this.accounts.forEach(a => { a.balance = null; });
        // Restaurar selección previa si existe
        const selKey = localStorage.getItem(this.cacheKeyForSelection(this.userId));
        if (selKey) {
          const found = this.accounts.find(x => String(x.accNum) === selKey || String(x.clabe) === selKey);
          if (found) {
            this.transferForm.patchValue({ origen: found });
            this.selectedOrigin = found;
            this.selectedCardStyle = this.getStyleFor(found);
          }
        } else if (!this.selectedOrigin && this.accounts.length) {
          // Selección por defecto: primera cuenta
          this.transferForm.patchValue({ origen: this.accounts[0] });
          this.selectedOrigin = this.accounts[0];
          this.selectedCardStyle = this.getStyleFor(this.accounts[0]);
        }
      }
    } catch {}
  }

  private saveAccountsCache(accs: any[]) {
    if (this.userId == null) return;
    try {
      // Guardar sin saldo para evitar mostrar información obsoleta al cargar desde cache
      const slim = (accs || []).map((a: any) => {
        const { balance, ...rest } = a || {};
        return rest;
      });
      localStorage.setItem(this.cacheKeyForAccounts(this.userId), JSON.stringify(slim));
    } catch {}
  }

  private fetchAccountsFromServer(userId: number, reselectionKey?: string) {
    this.usuariosService.getAccountsByUser(userId).subscribe({
      next: (response: any) => {
        const accs = response?.data || response?.accounts || (Array.isArray(response) ? response : []);
        const mapped = this.mapAccounts(accs);
        this.accounts = mapped;
        this.accountsRefreshed = true;
        this.saveAccountsCache(accs);
        
        setTimeout(() => {
          const selKey = reselectionKey || (this.userId != null ? localStorage.getItem(this.cacheKeyForSelection(this.userId)) || '' : '');
          if (selKey) {
            const found = this.accounts.find(x => String(x.accNum) === selKey || String(x.clabe) === selKey);
            if (found) {
              this.transferForm.patchValue({ origen: found });
              this.selectedOrigin = found;
              this.selectedCardStyle = this.getStyleFor(found);
            }
          }
        }, 0);
      },
      error: () => {
      }
    });
  }

  // 🆕 Método para descargar el PDF del comprobante
  downloadPDF() {
    if (!this.lastTransferId) {
      this.errorMsg = 'No hay comprobante disponible';
      return;
    }
    
    const url = `http://localhost:3000/api/usuarios/transfer-pdf/${this.lastTransferId}`;
    window.open(url, '_blank');
  }

  // 🆕 Método para abrir el comprobante en una nueva pestaña
  openReceipt() {
    if (!this.lastTransferId) {
      this.errorMsg = 'No hay comprobante disponible';
      return;
    }
    
    const url = `http://localhost:3000/api/usuarios/receipt/${this.lastTransferId}`;
    window.open(url, '_blank');
  }
}
