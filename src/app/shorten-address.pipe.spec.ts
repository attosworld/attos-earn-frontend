import { ShortenAddressPipe } from './shorten-address.pipe';

describe('ShortenAddressPipe', () => {
  it('create an instance', () => {
    const pipe = new ShortenAddressPipe();
    expect(pipe).toBeTruthy();
  });
});
