import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscordVerifyComponent } from './discord-verify.component';

describe('DiscordVerifyComponent', () => {
  let component: DiscordVerifyComponent;
  let fixture: ComponentFixture<DiscordVerifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscordVerifyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscordVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
