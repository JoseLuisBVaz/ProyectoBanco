import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-error-500',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './error-500.html',
  styleUrls: ['./error-500.css']
})
export class Error500Component {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  reload() {
    window.location.reload();
  }
}
