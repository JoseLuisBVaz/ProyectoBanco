import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Credito } from './credito';

describe('Credito', () => {
  let component: Credito;
  let fixture: ComponentFixture<Credito>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Credito]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Credito);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
