import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterEmp } from './register-emp';

describe('RegisterEmp', () => {
  let component: RegisterEmp;
  let fixture: ComponentFixture<RegisterEmp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterEmp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterEmp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
