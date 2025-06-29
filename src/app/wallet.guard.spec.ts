import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { walletGuard } from './wallet.guard';

describe('walletGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => walletGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
