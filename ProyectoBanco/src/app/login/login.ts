import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LogIn {
  rolesMenuVisible = false;

  toggleRolesMenu() {
    this.rolesMenuVisible = !this.rolesMenuVisible;
  }
}
