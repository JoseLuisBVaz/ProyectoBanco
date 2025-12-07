import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, IonContent],
  templateUrl: './main.html',
  styleUrls: ['./main.css']
})
export class Main {
  rolesMenuVisible = false;

  toggleRolesMenu() {
    this.rolesMenuVisible = !this.rolesMenuVisible;
  }
}
