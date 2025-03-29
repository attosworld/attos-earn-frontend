import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoolIconPairComponent } from './pool-icon-pair.component';

describe('PoolIconPairComponent', () => {
  let component: PoolIconPairComponent;
  let fixture: ComponentFixture<PoolIconPairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoolIconPairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoolIconPairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
