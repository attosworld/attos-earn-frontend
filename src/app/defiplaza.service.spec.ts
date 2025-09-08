import { TestBed } from '@angular/core/testing';

import { DefiplazaService } from './defiplaza.service';

describe('DefiplazaService', () => {
  let service: DefiplazaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DefiplazaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
