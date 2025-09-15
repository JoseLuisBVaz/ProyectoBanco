import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cancelacion } from './cancelacion';

describe('Cancelacion', () => {
  let component: Cancelacion;
  let fixture: ComponentFixture<Cancelacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cancelacion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cancelacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
