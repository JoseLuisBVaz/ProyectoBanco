import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class Main {
  rolesMenuVisible = false;

  toggleRolesMenu() {
    this.rolesMenuVisible = !this.rolesMenuVisible;
  }
}
