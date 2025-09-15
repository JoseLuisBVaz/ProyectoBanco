import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-login-gerente',
  standalone: true,
  imports: [FormsModule, Navbar, CommonModule, RouterLink],
  templateUrl: './login-gerente.html',
  styleUrls: ['./login-gerente.css']
})

export class LoginGerente {
  employeeNumber: string = '';
  password: string = '';
  passwordVisible: boolean = false;

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  login() {
    console.log('Número de empleado:', this.employeeNumber);
    console.log('Contraseña:', this.password);
  }
}