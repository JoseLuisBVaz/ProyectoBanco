import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-cancelacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './cancelacion.html',
  styleUrls: ['./cancelacion.css']
})
export class Cancelacion {
  cancelForm: FormGroup;
  modalVisible = false;
  modalMensaje = '';
  modalClase = '';
  modalIcono = 'ℹ';

  constructor(private fb: FormBuilder) {
    this.cancelForm = this.fb.group({
      motivo: ['', Validators.required],
      idcliente: ['', Validators.required],
      contrasena: ['', Validators.required]
    });
  }

  mostrarModal() {
    if (!this.cancelForm.valid) {
      this.modalClase = 'modal-rechazado';
      this.modalMensaje = '¡Atención!<br>Debes completar todos los campos.';
    } else {
      const tieneAdeudos = false;
      if (!tieneAdeudos) {
        this.modalClase = 'modal-aceptado';
        this.modalMensaje = '¡Felicidades!<br>Tu cuenta fue eliminada con éxito.';
      } else {
        this.modalClase = 'modal-rechazado';
        this.modalMensaje = '¡Lo sentimos!<br>No puedes eliminar tu cuenta por adeudos pendientes.';
      }
    }

    this.modalVisible = true;
  }



  cerrarModal() {
    this.modalVisible = false;
  }
}