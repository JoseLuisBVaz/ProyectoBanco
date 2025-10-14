import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register-emp',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar, HttpClientModule, RouterModule],
  templateUrl: './register-emp.html',
  styleUrls: ['./register-emp.css']
})
export class Register {
  mail = '';
  pass = '';
  confirmPass = '';
  rol = '';
  firstName = '';
  lastNameP = '';
  lastNameM = '';
  phoneNumber = '';
  birthday = '';
  address = '';
  curp = '';
  rfc = '';
  nss = '';
  errorMsg = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(private http: HttpClient, private router: Router) {}

  onRoleChange() {
    this.errorMsg = '';
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPassword() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  register() {
    if (!this.mail || !this.pass || !this.confirmPass || !this.rol) {
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

    if (!this.firstName || !this.lastNameP || !this.phoneNumber || !this.curp) {
      this.errorMsg = 'Completa todos los datos personales.';
      return;
    }

    const mainData = { mail: this.mail, pass: this.pass, rol: this.rol };

    const userData: any = {
      ...mainData,
      firstName: this.firstName,
      lastNameP: this.lastNameP,
      lastNameM: this.lastNameM,
      phoneNumber: this.phoneNumber,
      birthday: this.birthday,
      address: this.address,
      curp: this.curp,
      rfc: this.rfc,
      nss: this.rol === 'c' ? null : this.nss,
      balance: this.rol === 'c' ? 0 : null,
      cardNum: null,
      creditCardNum: null
    };

    console.log('Datos enviados al backend:', userData);

    this.http.post('http://localhost:3000/api/register', userData).subscribe({
      next: () => {
        alert('Registro exitoso');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = 'Error al registrar. Intenta de nuevo.';
      }
    });
  }
}
