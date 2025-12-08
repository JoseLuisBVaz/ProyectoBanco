import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-formulario-contrasena',
  imports: [CommonModule, FormsModule, RouterModule, Navbar, IonContent],
  templateUrl: './formulario-contrasena.html',
  styleUrl: './formulario-contrasena.css'
})
export class FormularioContrasena {
  // Estado del formulario
  step: number = 1; // 1 = solicitar código, 2 = verificar y cambiar
  loading: boolean = false;
  codeSent: boolean = false; // Bandera para mostrar confirmación

  // Campos del formulario
  email: string = '';
  verificationCode: string = '';
  password: string = '';
  confirmPassword: string = '';
  
  // Control de visibilidad
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;
  
  // Mensajes
  errorMsg: string = '';
  successMsg: string = '';
  
  // Control de reenvío
  canResend: boolean = false;
  resendTimer: number = 60;
  private timerInterval: any;

  private apiUrl = 'http://18.116.122.121:3000/api/usuarios';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPassword() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  // PASO 1: Solicitar código de verificación
  requestCode() {
    this.errorMsg = '';
    this.successMsg = '';
    this.codeSent = false;

    // Validar email
    if (!this.email) {
      this.errorMsg = 'Por favor, ingresa tu correo electrónico';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMsg = 'Por favor, ingresa un correo electrónico válido';
      return;
    }

    this.loading = true;

    // Llamar al endpoint para solicitar el código
    this.http.post(`${this.apiUrl}/password-reset/request`, { mail: this.email })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          console.log('Respuesta del servidor:', response);
          
          if (response.success) {
            this.codeSent = true;
            this.errorMsg = '';
            console.log('Código enviado exitosamente, cambiando al paso 2 en 2 segundos...');
            console.log('Step actual:', this.step);
            
            // Forzar detección de cambios
            this.cdr.detectChanges();
            
            // Cambiar al paso 2 después de mostrar confirmación
            setTimeout(() => {
              this.step = 2;
              this.codeSent = false;
              console.log('Cambió al paso 2, step:', this.step);
              
              // Forzar detección de cambios después del cambio
              this.cdr.detectChanges();
              
              this.startResendTimer();
            }, 2000);
          } else {
            this.errorMsg = response.msg || 'Error al enviar el código';
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al solicitar código:', error);
          
          // Mostrar error más específico
          if (error.status === 404) {
            this.errorMsg = 'Servicio no disponible. Verifica que el servidor esté corriendo.';
          } else if (error.status === 0) {
            this.errorMsg = 'No se puede conectar al servidor. Verifica la conexión.';
          } else {
            this.errorMsg = error.error?.msg || 'Error al enviar el código. Inténtalo de nuevo.';
          }
        }
      });
  }

  // PASO 2: Verificar código y cambiar contraseña
  verifyAndReset() {
    this.errorMsg = '';
    this.successMsg = '';

    console.log('=== Verificando datos ===');
    console.log('Email:', this.email);
    console.log('Código:', this.verificationCode);
    console.log('Contraseña:', this.password ? '***' : 'vacía');

    // Validaciones
    if (!this.verificationCode) {
      this.errorMsg = 'Por favor, ingresa el código de verificación';
      return;
    }

    if (this.verificationCode.length !== 6) {
      this.errorMsg = 'El código debe tener 6 dígitos';
      return;
    }

    if (!this.password || !this.confirmPassword) {
      this.errorMsg = 'Por favor, completa todos los campos';
      return;
    }

    if (this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    const requestData = {
      mail: this.email,
      token: this.verificationCode,
      newPassword: this.password
    };
    
    console.log('Enviando solicitud de reset:', requestData);

    // Llamar al endpoint para verificar código y cambiar contraseña
    this.http.post(`${this.apiUrl}/password-reset/reset`, requestData).subscribe({
      next: (response: any) => {
        this.loading = false;
        console.log('Respuesta del reset:', response);
        
        if (response.success) {
          this.successMsg = '¡Contraseña restablecida exitosamente!';
          
          // Limpiar los campos de contraseña y código
          this.verificationCode = '';
          this.password = '';
          this.confirmPassword = '';
          
          // Detener el temporizador
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
          }
        } else {
          this.errorMsg = response.msg || 'Error al restablecer la contraseña';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al restablecer contraseña:', error);
        console.error('Detalle del error:', error.error);
        this.errorMsg = error.error?.msg || 'Error al restablecer la contraseña. Inténtalo de nuevo.';
      }
    });
  }

  // Control del temporizador de reenvío
  startResendTimer() {
    this.canResend = false;
    this.resendTimer = 60;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      
      if (this.resendTimer <= 0) {
        this.canResend = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  // Volver al paso 1
  goBackToStep1() {
    this.step = 1;
    this.verificationCode = '';
    this.password = '';
    this.confirmPassword = '';
    this.errorMsg = '';
    this.successMsg = '';
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
