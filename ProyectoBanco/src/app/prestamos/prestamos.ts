import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-prestamo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './prestamos.html',
  styleUrls: ['./prestamos.css']
})
export class Prestamo {
  prestamoForm: FormGroup;
  modalVisible = false;
  modalMensaje = '';
  modalIcono = '';
  modalClase = '';

  constructor(private fb: FormBuilder) {
    this.prestamoForm = this.fb.group({
      monto: [0, [Validators.required, Validators.min(1)]],
      plazo: ['', Validators.required],
      destino: ['', Validators.required],
      ingresos: [0, [Validators.required, Validators.min(1)]],
      domicilio: ['', Validators.required],
      contrasena: ['', Validators.required]
    });
  }

  aceptarPrestamo() {
    const { monto, plazo, destino, ingresos, domicilio, contrasena } = this.prestamoForm.value;

    if (!monto || !plazo || !destino || !ingresos || !domicilio || !contrasena) {
      this.modalClase = 'modal-rechazado';
      this.modalIcono = '⚠';
      this.modalMensaje = '¡Atención!<br>Debes completar todos los campos.';
    } else if (contrasena === '1234') {
      this.modalClase = 'modal-aceptado';
      this.modalIcono = 'ℹ';
      this.modalMensaje = '¡Felicidades!<br>El préstamo fue aceptado.';
    } else {
      this.modalClase = 'modal-rechazado';
      this.modalIcono = 'ℹ';
      this.modalMensaje = '¡Lo sentimos!<br>Contraseña incorrecta. No se pudo aprobar el préstamo.';
    }

    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
  }

  cancelarPrestamo() {
    this.prestamoForm.reset();
    this.cerrarModal();
  }
}
