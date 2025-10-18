import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { RouterLink } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar, RouterLink, HttpClientModule],
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
  private isBrowser: boolean;

  constructor(
    private loginService: LoginService,
    private usuariosService: UsuariosService,
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
      console.debug('[Home] Perfil recibido:', u);
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
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.allAccounts = arr;
        this.account = arr[0] ?? null;
        this.otherAccounts = this.account ? arr.slice(1) : [];
        this.noAccount = !this.account;
        if (this.account) {
          this.cardStyle = this.getStyleFor(this.account);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.noAccount = true;
        console.warn('[Home] No se pudo obtener cAccount:', err?.status || err);
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

  // Selección de cuenta deshabilitada (se mantiene cuenta principal fija)

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
}
