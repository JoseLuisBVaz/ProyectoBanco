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
      console.log('🔐 [BIOMETRIC] Iniciando autenticación biométrica...');
      console.log('🔐 [BIOMETRIC] Datos de login:', loginData);
      
      const result: any = await BiometricAuth.authenticate({
        reason: 'Confirma tu identidad para acceder',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Usar código',
        androidTitle: 'Autenticación requerida',
        androidSubtitle: 'Banco JETY',
        androidConfirmationRequired: false
      });

      console.log('🔐 [BIOMETRIC] Resultado:', result);

      if (result?.authenticated) {
        console.log('✅ [BIOMETRIC] Autenticación exitosa, navegando...');
        this.navigateByRole(loginData);
      } else {
        console.log('⚠️ [BIOMETRIC] Autenticación no completada, navegando de todos modos...');
        // Navegar de todos modos si el usuario cancela
        this.navigateByRole(loginData);
      }
    } catch (error: any) {
      console.error('❌ [BIOMETRIC] Error:', error);
      console.log('⚠️ [BIOMETRIC] Error en biometría, navegando sin ella...');
      // Si hay error, navegar de todos modos
      this.navigateByRole(loginData);
    }
  }

  navigateByRole(res: any) {
    console.log('🔍 [NAV] Datos recibidos para navegación:', res);
    
    // Obtener el rol del objeto user o directamente
    const user = res.user || res;
    const rawRol = user.rol || res.rol || '';
    const rol = String(rawRol).trim().toLowerCase();
    
    console.log('🔍 [NAV] Usuario:', user);
    console.log('🔍 [NAV] Rol normalizado:', rol);
    
    if (rol === 'e' || rol.startsWith('e') || rol.includes('emple')) {
      console.log('➡️ [NAV] Navegando a /novedades (empleado)...');
      this.router.navigate(['/novedades']).then((success) => {
        console.log('✅ [NAV] Navegación exitosa:', success);
      }).catch((err) => {
        console.error('❌ [NAV] Error en navegación:', err);
      });
    } else if (rol === 'm' || rol.startsWith('m') || rol.includes('manager') || rol.includes('manej')) {
      console.log('➡️ [NAV] Navegando a /novedades (manager)...');
      this.router.navigate(['/novedades']).then((success) => {
        console.log('✅ [NAV] Navegación exitosa:', success);
      }).catch((err) => {
        console.error('❌ [NAV] Error en navegación:', err);
      });
    } else if (rol === 'c' || rol.startsWith('c') || rol.includes('cliente') || rol.includes('cust')) {
      console.log('➡️ [NAV] Navegando a /home (cliente)...');
      this.router.navigate(['/home']).then((success) => {
        console.log('✅ [NAV] Navegación exitosa:', success);
      }).catch((err) => {
        console.error('❌ [NAV] Error en navegación:', err);
      });
    } else {
      console.error('❌ [NAV] Rol no reconocido:', rol);
      if (res && (res.success === true || user.success === true)) {
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

    console.log('🔵 [LOGIN] Iniciando login...');
    console.log('🔵 [LOGIN] Mail:', this.mail);
    console.log('🔵 [LOGIN] API URL:', 'http://18.116.122.121:3000/api/usuarios/login');

    this.loginService.login(this.mail, this.password).subscribe({
      next: async (res) => {
        console.log('✅ [LOGIN] Respuesta del backend:', JSON.stringify(res));

        console.log('🔍 [LOGIN] Procesando rol:', res && res.rol);
        if (res && (res.rol || (res as any).role || (res as any).success === true)) {
          // Si está en Android y hay biometría disponible, pedir autenticación
          if (Capacitor.getPlatform() === 'android' && this.isBiometricAvailable) {
            console.log('🔐 [LOGIN] Solicitando autenticación biométrica...');
            await this.authenticateWithBiometric(res);
          } else {
            // Si no es Android o no hay biometría, navegar directamente
            console.log('➡️ [LOGIN] Navegando sin biometría...');
            this.navigateByRole(res);
          }
        } else {
          console.error('❌ [LOGIN] Respuesta inválida del backend');
          this.errorMsg = 'Usuario o contraseña incorrectos';
        }
      },
      error: (err) => {
        console.error('❌ [LOGIN] Error del backend:', err);
        console.error('❌ [LOGIN] Error status:', err.status);
        console.error('❌ [LOGIN] Error message:', err.message);
        console.error('❌ [LOGIN] Error completo:', JSON.stringify(err));
        
        if (err.status === 0) {
          this.errorMsg = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
        } else if (err.status === 404) {
          this.errorMsg = 'Servidor no encontrado. Verifica la configuración.';
        } else if (err.status === 401) {
          this.errorMsg = 'Usuario o contraseña incorrectos';
        } else {
          this.errorMsg = `Error: ${err.status || 'Desconocido'}. No se pudo completar el login.`;
        }
      }
    });
  }
}
