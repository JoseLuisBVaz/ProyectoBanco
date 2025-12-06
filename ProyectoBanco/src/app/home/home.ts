import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { Router, RouterLink } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { HttpClientModule } from '@angular/common/http';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonMenuButton, IonBackButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline } from 'ionicons/icons';

addIcons({ personCircleOutline });

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar, RouterLink, HttpClientModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon, IonMenuButton],
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  userName: string = '';
  account: any | null = null;
  noAccount = false;
  cardStyle: { [k: string]: string } = {};
  allAccounts: any[] = [];
  otherAccounts: any[] = [];
  hasTriedProfile = false;
  showCreditModal: boolean = false;
  private isBrowser: boolean;

  constructor(
    private loginService: LoginService,
    private usuariosService: UsuariosService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return;
    }

    const cached = this.loginService.getCurrentUser();
    if (cached) {
      const displayCached = cached?.firstName
        ? `${cached.firstName} ${cached.lastNameP ?? ''}`.trim()
        : null;
      if (displayCached) {
        this.userName = displayCached;
      }
      if (cached.mainId) {
        this.loadAccount(cached.mainId);
      }
    }

    this.loginService.getCurrentUserProfile().subscribe((u: any) => {
      const display = u?.firstName
        ? `${u.firstName} ${u.lastNameP ?? ''}`.trim()
        : null;
      this.userName = display || this.userName || '';
      this.hasTriedProfile = true;
      this.cdr.markForCheck();
      if (u?.mainId && !this.account) {
        this.loadAccount(u.mainId);
      }
    });
  }

  private loadAccount(mainId: number) {
    this.usuariosService.getAccountsByUser(mainId).subscribe({
      next: (response: any) => {
        const list = response?.data || response;
        
        const arr = (Array.isArray(list) ? list : []).map((a: any) => ({
          ...a,
          accNum: a.accNum ?? a.accountNumber ?? a.number ?? a.accnum,
          clabe: a.clabe ?? a.CLABE ?? a.clabeNumber,
          cardNum: a.cardNum ?? a.cardNumber,
          balance: (a.balance != null ? Number(a.balance) : null),
          accType: a.accType ?? a.type
        }));
        
        this.allAccounts = arr;
        this.account = arr[0] ?? null;
        this.otherAccounts = this.account ? arr.slice(1) : [];
        this.noAccount = !this.account;
        
        if (this.account) {
          this.cardStyle = this.getStyleFor(this.account);
        }
        
        if (this.shouldShowCreditModal()) {
          setTimeout(() => {
            this.showCreditModal = true;
            this.cdr.markForCheck();
          }, 2000);
        }
        
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.noAccount = true;
        console.error('Error al obtener cuentas:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private getStyleFor(acc: any): { [k: string]: string } {
    const key = String(acc?.accNum || acc?.clabe || acc?.cardNum || 'x');
    const idx = this.hashString(key) % this.palettes.length;
    return { background: this.palettes[idx], color: '#ffffff' };
  }

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

  closeCreditModal() {
    this.showCreditModal = false;
    const now = new Date();
    localStorage.setItem('creditModalLastShown', now.toISOString());
    this.cdr.markForCheck();
  }

  goToCreditLine() {
    this.showCreditModal = false;
    const now = new Date();
    localStorage.setItem('creditModalLastShown', now.toISOString());
    this.router.navigate(['/credito']);
  }

  private shouldShowCreditModal(): boolean {
    const lastShown = localStorage.getItem('creditModalLastShown');
    
    if (!lastShown) {
      return true;
    }

    const lastDate = new Date(lastShown);
    const now = new Date();
    const timeDiff = now.getTime() - lastDate.getTime();
    const oneMinuteFifteenSeconds = 75000;
    
    return timeDiff >= oneMinuteFifteenSeconds;
  }
}
