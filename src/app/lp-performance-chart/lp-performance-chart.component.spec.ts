import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LpPerformanceChartComponent } from './lp-performance-chart.component';

describe('LpPerformanceChartComponent', () => {
  let component: LpPerformanceChartComponent;
  let fixture: ComponentFixture<LpPerformanceChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LpPerformanceChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LpPerformanceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
