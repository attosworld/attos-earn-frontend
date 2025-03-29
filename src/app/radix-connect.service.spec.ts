import { TestBed } from '@angular/core/testing';

import { RadixConnectService } from './radix-connect.service';

describe('RadixConnectService', () => {
  let service: RadixConnectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RadixConnectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
