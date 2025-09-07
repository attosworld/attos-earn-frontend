import { TestBed } from '@angular/core/testing';

import { AstrolescentService } from './astrolescent.service';

describe('AstrolescentService', () => {
  let service: AstrolescentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AstrolescentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
