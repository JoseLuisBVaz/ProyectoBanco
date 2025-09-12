import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [FormsModule, CommonModule, Navbar],
  templateUrl: './login-cliente.html',
  styleUrls: ['./login-cliente.css']
})
export class LoginCliente {
  cardNumber: string = '';
  password: string = '';
  passwordVisible: boolean = false;

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  login() {
    console.log('Número de tarjeta:', this.cardNumber);
    console.log('Contraseña:', this.password);
  }

  goBack() {
    window.history.back();
  }
}
