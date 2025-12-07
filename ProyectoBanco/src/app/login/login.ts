import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClientModule } from '@angular/common/http';
import { LoginService } from '../services/login.service';
import { Router, RouterModule } from '@angular/router';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule, RouterModule, IonContent],
  providers: [LoginService],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LogIn {
  mail: string = '';
  password: string = '';
  passwordVisible: boolean = false;
  errorMsg: string = '';
  isBiometricAvailable: boolean = false;
  pendingLoginData: any = null;

  constructor(private loginService: LoginService, private router: Router) {
    this.checkBiometricAvailability();
  }

  async checkBiometricAvailability() {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const result = await BiometricAuth.checkBiometry();
        this.isBiometricAvailable = result.isAvailable;
        console.log('Biometría disponible:', this.isBiometricAvailable);
      } catch (error) {
        console.error('Error verificando biometría:', error);
        this.isBiometricAvailable = false;
      }
    }
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  async authenticateWithBiometric(loginData: any): Promise<void> {
    try {
      const result: any = await BiometricAuth.authenticate({
        reason: 'Confirma tu identidad para acceder',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: false,
        iosFallbackTitle: 'Usar código',
        androidTitle: 'Autenticación requerida',
        androidSubtitle: 'Banco JETY',
        androidConfirmationRequired: false
      });

      if (result?.authenticated) {
        console.log('✅ Autenticación biométrica exitosa');
        this.navigateByRole(loginData);
      } else {
        this.errorMsg = 'Autenticación biométrica fallida';
      }
    } catch (error: any) {
      console.error('❌ Error en autenticación biométrica:', error);
      this.errorMsg = 'Error en autenticación biométrica';
    }
  }

  navigateByRole(res: any) {
    const rawRol = res.rol || (res as any).role || '';
    const rol = String(rawRol).trim().toLowerCase();
    console.log('Rol normalizado:', rol);
    
    if (rol === 'e' || rol.startsWith('e') || rol.includes('emple')) {
      this.router.navigate(['/novedades']).then(() => {
        console.log('Navegación a /novedades exitosa');
      });
    } else if (rol === 'm' || rol.startsWith('m') || rol.includes('manager') || rol.includes('manej')) {
      this.router.navigate(['/novedades']).then(() => {
        console.log('Navegación a /novedades exitosa (rol m)');
      });
    } else if (rol === 'c' || rol.startsWith('c') || rol.includes('cliente') || rol.includes('cust')) {
      this.router.navigate(['/home']).then(() => {
        console.log('Navegación a /home exitosa');
      });
    } else {
      if (res && (res as any).success === true) {
        this.errorMsg = 'Rol no reconocido';
        console.warn('Rol no reconocido en respuesta:', res);
      } else {
        this.errorMsg = 'Usuario o contraseña incorrectos';
        console.warn('Login rechazado en frontend, respuesta:', res);
      }
    }
  }

  login() {
    if (!this.mail || !this.password) {
      this.errorMsg = 'Debes llenar todos los campos';
      return;
    }

    console.log('Intentando login con:', this.mail, this.password);

    this.loginService.login(this.mail, this.password).subscribe({
      next: async (res) => {
        console.log('Respuesta del backend:', res);

        console.log('Procesando rol en frontend:', res && res.rol);
        if (res && (res.rol || (res as any).role || (res as any).success === true)) {
          // Si está en Android y hay biometría disponible, pedir autenticación
          if (Capacitor.getPlatform() === 'android' && this.isBiometricAvailable) {
            await this.authenticateWithBiometric(res);
          } else {
            // Si no es Android o no hay biometría, navegar directamente
            this.navigateByRole(res);
          }
        } else {
          this.errorMsg = 'Usuario o contraseña incorrectos';
        }
      },
      error: (err) => {
        console.error('Error del backend:', err);
        this.errorMsg = 'Usuario o contraseña incorrectos';
      }
    });
  }
}
