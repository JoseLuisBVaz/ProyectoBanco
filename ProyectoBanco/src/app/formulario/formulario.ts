
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { InactivityService } from '../services/inactivity.service';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, Navbar, IonContent],
  templateUrl: './formulario.html',
  styleUrls: ['./formulario.css']
})
export class Formulario implements OnInit, OnDestroy {
  cuentaForm: FormGroup;
  modalVisible = false;
  modalTitle = '';
  modalMsg = '';
  modalError = false;
  loading = false;
  customers: any[] = [];
  loadingCustomers = false;
  selectedCustomer: any = null;
  passwordVisible = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private inactivityService: InactivityService
  ) {
    this.cuentaForm = this.fb.group({
      mainId: ['', Validators.required],
      accType: ['', Validators.required],
      accPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      curp: ['', [Validators.required, Validators.minLength(18), Validators.maxLength(18)]]
    });
  }

  ngOnInit() {
    this.inactivityService.startWatching();
    
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      this.modalTitle = 'Error';
      this.modalMsg = 'No se encontró información del usuario. Por favor, inicie sesión nuevamente.';
      this.modalError = true;
      this.modalVisible = true;
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    // Cargar lista de clientes
    this.loadCustomers();
  }

  loadCustomers() {
    this.loadingCustomers = true;
    this.cuentaForm.get('mainId')?.disable(); // Deshabilitar mientras carga
    
    this.http.get<any[]>('http://18.116.122.121:3000/api/usuarios/customers')
      .subscribe({
        next: (customers) => {
          this.customers = customers;
          this.loadingCustomers = false;
          this.cuentaForm.get('mainId')?.enable(); // Habilitar después de cargar
        },
        error: (error) => {
          console.error('Error al cargar clientes:', error);
          this.loadingCustomers = false;
          this.cuentaForm.get('mainId')?.enable(); // Habilitar incluso si hay error
          this.modalTitle = 'Error';
          this.modalMsg = 'No se pudieron cargar los clientes.';
          this.modalError = true;
          this.modalVisible = true;
        }
      });
  }

  onCustomerSelected() {
    const mainId = this.cuentaForm.get('mainId')?.value;
    if (mainId) {
      this.selectedCustomer = this.customers.find(c => c.mainId == mainId);
      if (this.selectedCustomer) {
        // Autocompletar el teléfono del cliente
        this.cuentaForm.patchValue({
          accPhone: this.selectedCustomer.phoneNumber || ''
        });
      }
    } else {
      this.selectedCustomer = null;
      this.cuentaForm.patchValue({
        accPhone: ''
      });
    }
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  submitForm() {
    if (this.cuentaForm.invalid) {
      this.modalTitle = 'Campos incompletos';
      this.modalMsg = 'Por favor, complete todos los campos correctamente.';
      this.modalError = true;
      this.modalVisible = true;
      return;
    }

    // Validar que el CURP coincida con el del cliente
    if (this.selectedCustomer && this.cuentaForm.value.curp !== this.selectedCustomer.curp) {
      this.modalTitle = 'CURP incorrecto';
      this.modalMsg = 'El CURP ingresado no coincide con el registrado del cliente.';
      this.modalError = true;
      this.modalVisible = true;
      return;
    }

    this.loading = true;

    // Obtener el usuario autenticado (manager/empleado que está creando la cuenta)
    const currentUserData = localStorage.getItem('currentUser');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;

    const accountData = {
      customerId: this.cuentaForm.value.mainId,
      createdBy: currentUser?.mainId,
      accType: this.cuentaForm.value.accType,
      accPhone: this.cuentaForm.value.accPhone,
      password: this.cuentaForm.value.password,
      curp: this.cuentaForm.value.curp
    };

    this.http.post('http://18.116.122.121:3000/api/usuarios/create-account', accountData)
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.modalTitle = '¡Éxito!';
          this.modalMsg = `Cuenta creada exitosamente.\nNúmero de cuenta: ${response.accNum || 'N/A'}`;
          this.modalError = false;
          this.modalVisible = true;
          this.cuentaForm.reset();
          this.selectedCustomer = null;
        },
        error: (error) => {
          this.loading = false;
          this.modalTitle = 'Error';
          this.modalMsg = error.error?.msg || 'Ocurrió un error al crear la cuenta. Intente nuevamente.';
          this.modalError = true;
          this.modalVisible = true;
        }
      });
  }

  closeModal() {
    this.modalVisible = false;
    if (!this.modalError) {
      this.router.navigate(['/user']);
    }
  }

  resetForm() {
    this.cuentaForm.reset();
  }

  ngOnDestroy() {
    this.inactivityService.stopWatching();
  }
}
