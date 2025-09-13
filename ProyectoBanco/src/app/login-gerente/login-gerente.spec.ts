import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginGerente } from './login-gerente';

describe('LoginGerente', () => {
  let component: LoginGerente;
  let fixture: ComponentFixture<LoginGerente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginGerente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginGerente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
