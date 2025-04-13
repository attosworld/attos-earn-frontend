import { TestBed } from '@angular/core/testing';

import { OciswapService } from './ociswap.service';

describe('OciswapService', () => {
  let service: OciswapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OciswapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
