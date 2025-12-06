import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { LoginService } from '../services/login.service';
import { Navbar } from '../navbar/navbar';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/angular/standalone';

interface Account {
  accountId: number;
  accNum: string;
  accType: string;
  balance: number;
  cardNum: string;
  clabe: string;
}

interface RetiroReciente {
  withdrawid: number;
  accnum: string;
  amount: number;
  description: string;
  withdrawdate: Date;
}

@Component({
  selector: 'app-retiro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
  templateUrl: './retiro.html',
  styleUrl: './retiro.css'
})
export class Retiro implements OnInit {
  retiroForm: FormGroup;
  userAccounts: Account[] = [];
  retirosRecientes: RetiroReciente[] = [];
  isProcessing: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  codigoGenerado: string = '';
  showAccountSelector = false;
  mainId: number | null = null;
  selectedAccount: Account | null = null;
  selectedCardStyle: any = {};
  remainingBalance: number | null = null;
  showPassword: boolean = false;

  private palettes: string[] = [
    'linear-gradient(135deg, #1a2aff 0%, #5b7dff 100%)',
    'linear-gradient(135deg, #5a189a 0%, #9c1de7 100%)',
    'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
    'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    'linear-gradient(135deg, #111827 0%, #374151 100%)'
  ];

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private usuariosService: UsuariosService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.retiroForm = this.fb.group({
      accountId: ['', Validators.required],
      amount: ['', [
        Validators.required,
        Validators.min(100),
        Validators.max(10000)
      ]],
      password: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.setupFormValidation();
  }

  /**
   * Carga los datos del usuario y sus cuentas
   */
  private loadUserData(): void {
    // Usar el mismo método que transfers
    const cachedUser = this.loginService.getCurrentUser();
    if (cachedUser && cachedUser.mainId) {
      this.mainId = cachedUser.mainId;
      this.loadUserAccounts();
      this.loadRetirosRecientes();
    } else {
      this.errorMessage = 'No se encontró información de usuario. Por favor, inicia sesión nuevamente.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  /**
   * Carga las cuentas del usuario
   */
  private loadUserAccounts(): void {
    if (!this.mainId) return;

    this.usuariosService.getAccountsByUser(this.mainId).subscribe({
      next: (response: any) => {
        const accountsArray = response?.data || response?.accounts || (Array.isArray(response) ? response : []);
        this.userAccounts = accountsArray;
        
        if (this.userAccounts.length > 0 && !this.selectedAccount) {
          this.selectedAccount = this.userAccounts[0];
          this.selectedCardStyle = this.getStyleFor(this.selectedAccount);
        }
        
        this.cdr.detectChanges();
        
        Promise.resolve().then(() => {
          if (this.selectedAccount) {
            this.retiroForm.patchValue({ accountId: this.selectedAccount.accountId });
          }
        });
      },
      error: (error: any) => {
        console.error('Error al cargar cuentas:', error);
        this.errorMessage = 'Error al cargar las cuentas. Por favor, intenta nuevamente.';
      }
    });
  }

  private loadRetirosRecientes(): void {
    if (!this.mainId) return;

    this.usuariosService.getRetirosRecientes(this.mainId).subscribe({
      next: (response: any) => {
        if (response.success && response.retiros) {
          this.retirosRecientes = response.retiros.slice(0, 5); // Solo los últimos 5
        }
      },
      error: (error: any) => {
        console.error('Error al cargar retiros recientes:', error);
      }
    });
  }

  /**
   * Configura la validación personalizada del formulario
   */
  private setupFormValidation(): void {
    // Validar saldo suficiente cuando cambia la cuenta o el monto
    this.retiroForm.get('accountId')?.valueChanges.subscribe(() => {
      this.validateSufficientFunds();
      this.calculateRemainingBalance();
    });

    this.retiroForm.get('amount')?.valueChanges.subscribe(() => {
      this.validateSufficientFunds();
      this.calculateRemainingBalance();
    });
  }

  /**
   * Valida que haya saldo suficiente
   */
  private validateSufficientFunds(): void {
    const accountId = this.retiroForm.get('accountId')?.value;
    const amount = this.retiroForm.get('amount')?.value;

    if (accountId && amount) {
      const selectedAccount = this.userAccounts.find(acc => acc.accountId === parseInt(accountId));
      
      if (selectedAccount && amount > selectedAccount.balance) {
        this.retiroForm.get('amount')?.setErrors({ insufficientFunds: true });
      } else if (this.retiroForm.get('amount')?.hasError('insufficientFunds')) {
        // Limpiar el error si ahora hay saldo suficiente
        const errors = this.retiroForm.get('amount')?.errors;
        if (errors) {
          delete errors['insufficientFunds'];
          const hasOtherErrors = Object.keys(errors).length > 0;
          this.retiroForm.get('amount')?.setErrors(hasOtherErrors ? errors : null);
        }
      }
    }
  }

  /**
   * Calcula el saldo restante después del retiro
   */
  private calculateRemainingBalance(): void {
    const amount = this.retiroForm.get('amount')?.value;
    if (this.selectedAccount && amount > 0) {
      this.remainingBalance = this.selectedAccount.balance - amount;
    } else {
      this.remainingBalance = null;
    }
  }

  /**
   * Getter para verificar si hay fondos insuficientes
   */
  get insufficientFunds(): boolean {
    return this.retiroForm.get('amount')?.hasError('insufficientFunds') ?? false;
  }

  /**
   * Maneja el cambio de cuenta seleccionada
   */
  onAccountChange(): void {
    const accountId = this.retiroForm.get('accountId')?.value;
    this.selectedAccount = this.userAccounts.find(acc => acc.accountId === parseInt(accountId)) || null;
    
    if (this.selectedAccount) {
      this.selectedCardStyle = this.getStyleFor(this.selectedAccount);
    }
    
    this.validateSufficientFunds();
    this.calculateRemainingBalance();
  }

  /**
   * Obtiene el estilo consistente para una cuenta basado en su número
   */
  private getStyleFor(acc: Account): { [k: string]: string } {
    const key = String(acc.accNum || acc.clabe || acc.cardNum || 'x');
    const idx = this.hashString(key) % this.palettes.length;
    return { background: this.palettes[idx], color: '#ffffff' };
  }

  /**
   * Genera un hash consistente para un string
   */
  private hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  /**
   * Establece un monto rápido
   */
  setQuickAmount(amount: number): void {
    this.retiroForm.patchValue({ amount });
    this.retiroForm.get('amount')?.markAsTouched();
    this.validateSufficientFunds();
    this.calculateRemainingBalance();
  }

  /**
   * Enmascara el número de cuenta
   */
  maskAcc(accNum: string): string {
    if (!accNum || accNum.length < 4) return accNum;
    return '*'.repeat(accNum.length - 4) + accNum.slice(-4);
  }

  /**
   * Enmascara el número de tarjeta
   */
  maskCard(cardNum: string): string {
    if (!cardNum || cardNum.length < 4) return cardNum;
    return '**** **** **** ' + cardNum.slice(-4);
  }

  /**
   * Alterna la visibilidad del selector de cuentas
   */
  toggleAccountSelector(): void {
    if (this.userAccounts.length > 1) {
      this.showAccountSelector = !this.showAccountSelector;
    }
  }

  /**
   * Selecciona una cuenta origen
   */
  selectOriginAccount(account: Account): void {
    this.selectedAccount = account;
    this.retiroForm.patchValue({ accountId: account.accountId });
    this.selectedCardStyle = this.getStyleFor(account);
    this.showAccountSelector = false;
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (this.retiroForm.invalid || this.isProcessing || !this.mainId) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const accountId = parseInt(this.retiroForm.get('accountId')?.value);
    const selectedAccount = this.userAccounts.find(acc => acc.accountId === accountId);

    if (!selectedAccount) {
      this.errorMessage = 'Cuenta no encontrada.';
      this.isProcessing = false;
      return;
    }

    const retiroData = {
      mainId: this.mainId,
      accNum: selectedAccount.accNum,
      amount: parseFloat(this.retiroForm.get('amount')?.value),
      password: this.retiroForm.get('password')?.value,
      description: this.retiroForm.get('description')?.value || 'Retiro sin tarjeta'
    };

    this.usuariosService.crearRetiroSinTarjeta(retiroData).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        
        if (response.success) {
          this.successMessage = 'Código de retiro generado exitosamente y enviado a tu correo';
          this.codigoGenerado = response.codigo || this.generarCodigoLocal();
          
          // Actualizar el saldo de la cuenta
          if (selectedAccount) {
            selectedAccount.balance -= retiroData.amount;
          }

          // Limpiar el campo de contraseña
          this.retiroForm.patchValue({ password: '' });

          // Recargar retiros recientes
          this.loadRetirosRecientes();

          // Hacer scroll al código
          setTimeout(() => {
            const codigoSection = document.querySelector('.codigo-section');
            if (codigoSection) {
              codigoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        } else {
          this.errorMessage = response.message || 'Error al generar el código de retiro';
        }
      },
      error: (error: any) => {
        this.isProcessing = false;
        console.error('Error al crear retiro:', error);
        this.errorMessage = error.error?.message || 'Error al procesar el retiro. Por favor, intenta nuevamente.';
      }
    });
  }

  /**
   * Genera un código de retiro local (fallback)
   */
  private generarCodigoLocal(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RET-${timestamp}-${random}`;
  }

  /**
   * Copia el código de retiro al portapapeles
   */
  copiarCodigo(): void {
    if (this.codigoGenerado) {
      navigator.clipboard.writeText(this.codigoGenerado).then(() => {
        const originalMessage = this.successMessage;
        this.successMessage = 'Código copiado al portapapeles';
        setTimeout(() => {
          this.successMessage = originalMessage;
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar:', err);
        this.errorMessage = 'No se pudo copiar el código';
      });
    }
  }

  /**
   * Cancela y regresa a la página anterior
   */
  cancelar(): void {
    this.router.navigate(['/main']);
  }

  /**
   * Inicia un nuevo retiro
   */
  nuevoRetiro(): void {
    this.resetForm();
  }

  /**
   * Reinicia el formulario
   */
  private resetForm(): void {
    this.retiroForm.reset();
    this.codigoGenerado = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedAccount = null;
    this.remainingBalance = null;
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
