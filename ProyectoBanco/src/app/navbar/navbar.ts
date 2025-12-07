import { Component, OnInit, DoCheck } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

interface User {
  mainId: number;
  firstName: string;
  lastNameP: string;
  lastNameM: string;
  mail: string;
  rol: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar implements OnInit, DoCheck {
  menuOpen = false;
  currentUser: User | null = null;
  private lastUserCheck: string | null = null;

  constructor(
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.loadUserData();
  }

  ngDoCheck() {
    // Verificar si el usuario sigue en localStorage cada vez que Angular detecta cambios
    const userStr = localStorage.getItem('currentUser');
    
    // Solo recargar si cambió el string de usuario (más eficiente)
    if (userStr !== this.lastUserCheck) {
      this.lastUserCheck = userStr;
      this.loadUserData();
    }
  }

  private loadUserData() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
    } else {
      this.currentUser = null;
    }
  }

  get userName(): string {
    if (!this.currentUser) return 'Usuario';
    return `${this.currentUser.firstName} ${this.currentUser.lastNameP} ${this.currentUser.lastNameM}`;
  }

  get userInitials(): string {
    if (!this.currentUser) return 'U';
    return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastNameP.charAt(0)}`;
  }

  get isCustomer(): boolean {
    return this.currentUser?.rol === 'c';
  }

  goBack() {
    this.location.back();
  }

  goToHome() {
    console.log('Navegando a home, currentUser:', this.currentUser);
    console.log('localStorage currentUser:', localStorage.getItem('currentUser'));
    
    if (this.isCustomer) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/novedades']);
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
