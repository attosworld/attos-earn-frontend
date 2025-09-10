import { TestBed } from '@angular/core/testing';

import { AttosService } from './attos.service';

describe('AttosService', () => {
  let service: AttosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
