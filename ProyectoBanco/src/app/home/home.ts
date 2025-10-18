import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { LoginService } from '../services/login.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [Navbar, RouterLink],
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  userName: string | null = null;

  constructor(private loginService: LoginService) {}
  ngOnInit() {
    this.loginService.getCurrentUserProfile().subscribe((u: any) => {
      const display = u?.firstName
        ? `${u.firstName} ${u.lastNameP ?? ''}`.trim()
        : (u?.name ?? u?.username ?? u?.mail ?? null);
      this.userName = display;
    });
  }
}
