import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-detalles-cuenta',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './user.html',
  styleUrls: ['./user.css']
})
export class DetallesCuenta {}
