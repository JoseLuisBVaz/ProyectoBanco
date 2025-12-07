import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { RouterLink } from '@angular/router';
import { InactivityService } from '../services/inactivity.service';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-novedades',
  standalone: true,
  imports: [CommonModule, Navbar, RouterLink, IonContent],
  templateUrl: './novedades.html',
  styleUrls: ['./novedades.css']
})
export class Novedades implements OnInit, OnDestroy {
  constructor(private inactivityService: InactivityService) {}

  ngOnInit() {
    this.inactivityService.startWatching();
  }

  ngOnDestroy() {
    this.inactivityService.stopWatching();
  }
}
