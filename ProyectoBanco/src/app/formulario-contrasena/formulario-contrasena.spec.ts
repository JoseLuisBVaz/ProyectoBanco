import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioContrasena } from './formulario-contrasena';

describe('FormularioContrasena', () => {
  let component: FormularioContrasena;
  let fixture: ComponentFixture<FormularioContrasena>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioContrasena]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioContrasena);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
