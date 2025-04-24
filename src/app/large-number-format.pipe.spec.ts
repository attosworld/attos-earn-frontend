import { LargeNumberFormatPipe } from './large-number-format.pipe';

describe('LargeNumberFormatPipe', () => {
  it('create an instance', () => {
    const pipe = new LargeNumberFormatPipe();
    expect(pipe).toBeTruthy();
  });
});
