import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YieldListComponent } from './yield-list.component';

describe('YieldListComponent', () => {
  let component: YieldListComponent;
  let fixture: ComponentFixture<YieldListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YieldListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YieldListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
