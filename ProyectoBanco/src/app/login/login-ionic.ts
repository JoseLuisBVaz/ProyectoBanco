import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Ionic Standalone Components
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardTitle, IonCardContent, IonItem, 
  IonInput, IonButton, IonIcon, IonText, IonFooter 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, eyeOutline, eyeOffOutline, alertCircleOutline } from 'ionicons/icons';

// Tus servicios existentes
// import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login-ionic.html', // Cambia a './login-ionic.html' para usar Ionic
  styleUrls: ['./login.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    // Ionic Components
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem,
    IonInput, IonButton, IonIcon, IonText, IonFooter
  ]
})
export class LoginIonicComponent {
  mail: string = '';
  password: string = '';
  passwordVisible: boolean = false;
  errorMsg: string = '';

  constructor(
    private router: Router,
    // private authService: AuthService // Descomenta cuando migres
  ) {
    // Registrar iconos de Ionicons
    addIcons({
      'person-outline': personOutline,
      'lock-closed-outline': lockClosedOutline,
      'eye-outline': eyeOutline,
      'eye-off-outline': eyeOffOutline,
      'alert-circle-outline': alertCircleOutline
    });
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  async login() {
    if (!this.mail || !this.password) {
      this.errorMsg = 'Por favor completa todos los campos';
      return;
    }

    try {
      // Aquí va tu lógica de login existente
      // const result = await this.authService.login(this.mail, this.password);
      
      // Ejemplo temporal:
      console.log('Login attempt:', this.mail);
      
      // Simulación de login exitoso (reemplazar con tu lógica)
      // this.router.navigate(['/main']);
      
    } catch (error) {
      this.errorMsg = 'Error al iniciar sesión. Verifica tus credenciales.';
      console.error('Login error:', error);
    }
  }
}
