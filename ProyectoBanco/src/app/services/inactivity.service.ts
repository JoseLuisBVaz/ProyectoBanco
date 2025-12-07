import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private inactivityTimer: any;
  private readonly INACTIVITY_TIME = 30000; // 30 segundos
  private isActive = false;
  
  constructor(private router: Router) {}

  startWatching() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.resetTimer();
    this.addEventListeners();
  }

  stopWatching() {
    this.isActive = false;
    this.clearTimer();
    this.removeEventListeners();
  }

  private resetTimer() {
    this.clearTimer();
    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity();
    }, this.INACTIVITY_TIME);
  }

  private clearTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private handleInactivity() {
    console.log('⏱️ Sesión cerrada por inactividad');
    this.stopWatching();
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('mail');
    this.router.navigate(['/login']);
  }

  private userActivity = () => {
    if (this.isActive) {
      this.resetTimer();
    }
  };

  private addEventListeners() {
    // Eventos del mouse
    window.addEventListener('mousemove', this.userActivity);
    window.addEventListener('mousedown', this.userActivity);
    window.addEventListener('click', this.userActivity);
    window.addEventListener('scroll', this.userActivity);
    
    // Eventos del teclado
    window.addEventListener('keypress', this.userActivity);
    window.addEventListener('keydown', this.userActivity);
    
    // Eventos táctiles (móviles)
    window.addEventListener('touchstart', this.userActivity);
    window.addEventListener('touchmove', this.userActivity);
    window.addEventListener('touchend', this.userActivity);
  }

  private removeEventListeners() {
    window.removeEventListener('mousemove', this.userActivity);
    window.removeEventListener('mousedown', this.userActivity);
    window.removeEventListener('click', this.userActivity);
    window.removeEventListener('scroll', this.userActivity);
    window.removeEventListener('keypress', this.userActivity);
    window.removeEventListener('keydown', this.userActivity);
    window.removeEventListener('touchstart', this.userActivity);
    window.removeEventListener('touchmove', this.userActivity);
    window.removeEventListener('touchend', this.userActivity);
  }
}
