import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-error-404',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './error-404.html',
  styleUrls: ['./error-404.css']
})
export class Error404Component {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    window.history.back();
  }
}
