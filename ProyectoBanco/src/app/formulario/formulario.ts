import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './formulario.html',
  styleUrls: ['./formulario.css']
})
export class Formulario {
  cuentaForm: FormGroup;
  modalVisible = false;
  modalTitle = '';
  modalMsg = '';
  modalError = false;

  constructor(private fb: FormBuilder) {
    this.cuentaForm = this.fb.group({
      nombre: ['', Validators.required],
      curp: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      calle: ['', Validators.required],
      cp: ['', Validators.required],
      municipio: ['', Validators.required],
      estado: ['', Validators.required],
      colonia: ['', Validators.required],
      pass1: ['', Validators.required],
      pass2: ['', Validators.required]
    });
  }

  submitForm() {
    if (this.cuentaForm.invalid) {
      this.modalTitle = 'Lo sentimos';
      this.modalMsg = 'Debe llenar todos los campos para crear la cuenta.';
      this.modalError = true;
    } else if (this.cuentaForm.value.pass1 !== this.cuentaForm.value.pass2) {
      this.modalTitle = 'Lo sentimos';
      this.modalMsg = 'Las contraseñas no coinciden.';
      this.modalError = true;
    } else {
      this.modalTitle = '¡Felicidades!';
      this.modalMsg = 'Tu cuenta ha sido creada con éxito.';
      this.modalError = false;
    }
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
  }

  resetForm() {
    this.cuentaForm.reset();
  }
}
