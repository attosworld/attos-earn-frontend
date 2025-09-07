import { TestBed } from '@angular/core/testing';

import { RootFinanceService } from './root-finance.service';

describe('RootFinanceService', () => {
  let service: RootFinanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RootFinanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
