import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstadoCuenta } from './estado-cuenta';

describe('EstadoCuenta', () => {
  let component: EstadoCuenta;
  let fixture: ComponentFixture<EstadoCuenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadoCuenta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstadoCuenta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
