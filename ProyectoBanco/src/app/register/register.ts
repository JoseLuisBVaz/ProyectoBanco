import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  mail = '';
  pass = '';
  confirmPass = '';
  // Registro exclusivo para clientes
  rol = 'c';
  firstName = '';
  lastNameP = '';
  lastNameM = '';
  phoneNumber = '';
  birthday = '';
  address = '';
  curp = '';
  rfc = '';
  errorMsg = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(private http: HttpClient, private router: Router) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPassword() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  register() {
    // Normalizar entradas (trim) para evitar errores por espacios
    this.mail = this.mail?.trim();
    this.pass = this.pass?.trim();
    this.confirmPass = this.confirmPass?.trim();
    // rol fijo como 'c' (cliente)
    this.rol = 'c';
    this.firstName = this.firstName?.trim();
    this.lastNameP = this.lastNameP?.trim();
    this.lastNameM = this.lastNameM?.trim();
    this.phoneNumber = this.phoneNumber?.trim();
    this.birthday = this.birthday?.trim();
    this.address = this.address?.trim();
    this.curp = this.curp?.trim();
    this.rfc = this.rfc?.trim();

    if (!this.mail || !this.pass || !this.confirmPass) {
      this.errorMsg = 'Completa los datos de acceso.';
      return;
    }

    if (this.pass !== this.confirmPass) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.pass.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (!this.firstName || !this.lastNameP || !this.phoneNumber || !this.curp || !this.birthday || !this.address) {
      this.errorMsg = 'Completa todos los datos personales (incluye fecha de nacimiento y dirección).';
      return;
    }

  const mainData = { mail: this.mail, pass: this.pass, rol: 'c' };

    const userData: any = {
      ...mainData,
      firstName: this.firstName,
      lastNameP: this.lastNameP,
      lastNameM: this.lastNameM,
      phoneNumber: this.phoneNumber,
      birthday: this.birthday,
      address: this.address,
      curp: this.curp,
      rfc: this.rfc
    };

    console.log('Datos enviados al backend:', userData);

    this.http.post('http://localhost:3000/api/register', userData).subscribe({
      next: () => {
        alert('Registro exitoso');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error en registro:', err);
        // Mostrar mensaje específico del backend cuando esté disponible
        const backendMsg = err?.error?.msg;
        if (backendMsg) {
          this.errorMsg = backendMsg;
        } else if (err?.status === 0) {
          this.errorMsg = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
        } else if (err?.status) {
          this.errorMsg = `Error (${err.status}): Intenta de nuevo.`;
        } else {
          this.errorMsg = 'Error al registrar. Intenta de nuevo.';
        }
      }
    });
  }
}
