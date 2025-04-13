import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrecisionPoolComponent } from './precision-pool.component';

describe('PrecisionPoolComponent', () => {
  let component: PrecisionPoolComponent;
  let fixture: ComponentFixture<PrecisionPoolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrecisionPoolComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrecisionPoolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
