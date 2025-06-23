import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartToggleComponent } from './chart-toggle.component';

describe('ChartToggleComponent', () => {
  let component: ChartToggleComponent;
  let fixture: ComponentFixture<ChartToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChartToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
