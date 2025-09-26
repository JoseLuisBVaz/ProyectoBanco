import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClientModule } from '@angular/common/http';
import { LoginService } from '../services/login.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule, RouterModule],
  providers: [LoginService],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LogIn {
  mail: string = '';
  password: string = '';
  passwordVisible: boolean = false;
  errorMsg: string = '';

  constructor(private loginService: LoginService, private router: Router) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  login() {
    if (!this.mail || !this.password) {
      this.errorMsg = 'Debes llenar todos los campos';
      return;
    }

    console.log('Intentando login con:', this.mail, this.password);

    this.loginService.login(this.mail, this.password).subscribe({
      next: (res) => {
        console.log('Respuesta del backend:', res);

        console.log('Procesando rol en frontend:', res && res.rol);
        if (res && (res.rol || (res as any).role || (res as any).success === true)) {
          // Normalize role: accept 'rol' or 'role', coerce to lowercase and trim
          const rawRol = res.rol || (res as any).role || '';
          const rol = String(rawRol).trim().toLowerCase();
          console.log('Rol normalizado:', rol);
          // Accept single-letter codes or full words like 'gerente','empleado','cliente'
          if (rol === 'g' || rol.startsWith('g') || rol.includes('gerente')) {
            this.router.navigate(['/novedades']).then(() => {
              console.log('Navegación a /novedades exitosa');
            });
          } else if (rol === 'e' || rol.startsWith('e') || rol.includes('emple')) {
            this.router.navigate(['/novedades']).then(() => {
              console.log('Navegación a /novedades exitosa');
            });
          } else if (rol === 'm' || rol.startsWith('m') || rol.includes('manager') || rol.includes('manej')) {
            // 'm' could be 'manager' or 'm' in DB - treat as gerente/empleado
            this.router.navigate(['/novedades']).then(() => {
              console.log('Navegación a /novedades exitosa (rol m)');
            });
          } else if (rol === 'c' || rol.startsWith('c') || rol.includes('cliente') || rol.includes('cust')) {
            this.router.navigate(['/cliente']).then(() => {
              console.log('Navegación a /cliente exitosa');
            });
          } else {
            // If backend indicated success but role is empty/unexpected, show message and dump response
            if (res && (res as any).success === true) {
              this.errorMsg = 'Rol no reconocido';
              console.warn('Rol no reconocido en respuesta:', res);
            } else {
              this.errorMsg = 'Usuario o contraseña incorrectos';
              console.warn('Login rechazado en frontend, respuesta:', res);
            }
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
