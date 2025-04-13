import { TestBed } from '@angular/core/testing';

import { RadixManifestService } from './radix-manifest.service';

describe('RadixManifestService', () => {
  let service: RadixManifestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RadixManifestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
