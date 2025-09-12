import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true, 
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class Navbar {

  constructor(private router: Router) {}

  logout() {
    console.log('Cerrar sesión');
    // Aquí puedes agregar tu lógica de logout
    // this.router.navigate(['/login']);
  }

  goProfile() {
    console.log('Ir a perfil');
    // Aquí puedes navegar al perfil
    // this.router.navigate(['/profile']);
  }
}
