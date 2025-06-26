import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyCardComponent } from './strategy-card.component';

describe('StrategyCardComponent', () => {
  let component: StrategyCardComponent;
  let fixture: ComponentFixture<StrategyCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategyCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
