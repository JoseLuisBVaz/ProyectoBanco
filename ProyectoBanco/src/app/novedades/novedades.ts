import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, Navbar, RouterLink],
  templateUrl: './novedades.html',
  styleUrls: ['./novedades.css']
})
export class Novedades {}
