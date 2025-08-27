import { LargeNumberFormatPipe } from './large-number-format.pipe';

describe('LargeNumberFormatPipe', () => {
  let pipe: LargeNumberFormatPipe;

  beforeEach(() => {
    pipe = new LargeNumberFormatPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('small numbers (< 1,000,000)', () => {
    it('should format zero', () => {
      expect(pipe.transform(0)).toBe('0.00');
    });

    it('should format small positive numbers with commas', () => {
      expect(pipe.transform(123)).toBe('123.00');
      expect(pipe.transform(1234)).toBe('1,234.00');
      expect(pipe.transform(12345)).toBe('12,345.00');
      expect(pipe.transform(123456)).toBe('123,456.00');
      expect(pipe.transform(999999)).toBe('999,999.00');
    });

    it('should format decimal numbers with commas', () => {
      expect(pipe.transform(1234.56)).toBe('1,234.56');
      expect(pipe.transform(38164.65)).toBe('38,164.65');
      expect(pipe.transform(999999.99)).toBe('999,999.99');
    });

    it('should format negative numbers with commas', () => {
      expect(pipe.transform(-1234)).toBe('-1,234.00');
      expect(pipe.transform(-38164.65)).toBe('-38,164.65');
      expect(pipe.transform(-999999)).toBe('-999,999.00');
    });
  });

  describe('large numbers (>= 1,000,000)', () => {
    it('should format millions', () => {
      expect(pipe.transform(1000000)).toBe('1.00M');
      expect(pipe.transform(1500000)).toBe('1.50M');
      expect(pipe.transform(999000000)).toBe('999.00M');
    });

    it('should format billions', () => {
      expect(pipe.transform(1000000000)).toBe('1.00B');
      expect(pipe.transform(2500000000)).toBe('2.50B');
      expect(pipe.transform(999000000000)).toBe('999.00B');
    });

    it('should format trillions', () => {
      expect(pipe.transform(1000000000000)).toBe('1.00T');
      expect(pipe.transform(5750000000000)).toBe('5.75T');
    });

    it('should format negative large numbers', () => {
      expect(pipe.transform(-1000000)).toBe('-1.00M');
      expect(pipe.transform(-2500000000)).toBe('-2.50B');
      expect(pipe.transform(-1000000000000)).toBe('-1.00T');
    });

    it('should handle very large numbers with higher abbreviations', () => {
      expect(pipe.transform(1e15)).toBe('1.00Q'); // Quadrillion
      expect(pipe.transform(1e18)).toBe('1.00Qi'); // Quintillion
      expect(pipe.transform(1e21)).toBe('1.00S'); // Sextillion
    });

    it('should cap at the highest abbreviation available', () => {
      const veryLargeNumber = 1e100;
      const result = pipe.transform(veryLargeNumber);
      expect(result).toContain('Tg'); // Should use the last abbreviation
    });
  });

  describe('string inputs', () => {
    it('should handle string numbers', () => {
      expect(pipe.transform('1234')).toBe('1,234.00');
      expect(pipe.transform('1000000')).toBe('1.00M');
      expect(pipe.transform('38164.65')).toBe('38,164.65');
    });

    it('should handle invalid string inputs', () => {
      expect(pipe.transform('invalid')).toBe('0');
      expect(pipe.transform('abc123')).toBe('0');
      expect(pipe.transform('')).toBe('0');
    });
  });

  describe('edge cases', () => {
    it('should handle NaN', () => {
      expect(pipe.transform(NaN)).toBe('0');
    });

    it('should handle Infinity', () => {
      expect(pipe.transform(Infinity)).toContain('Tg');
      expect(pipe.transform(-Infinity)).toContain('-');
    });

    it('should handle very small positive numbers', () => {
      expect(pipe.transform(0.01)).toBe('0.01');
      expect(pipe.transform(0.001)).toBe('0.00');
    });

    it('should handle numbers at the boundary', () => {
      expect(pipe.transform(999999.99)).toBe('999,999.99');
      expect(pipe.transform(1000000)).toBe('1.00M');
    });
  });

  describe('precision and rounding', () => {
    it('should round to 2 decimal places for large numbers', () => {
      expect(pipe.transform(1234567)).toBe('1.23M');
      expect(pipe.transform(1235567)).toBe('1.24M'); // Should round up
      expect(pipe.transform(1999999)).toBe('2.00M'); // Should round up
    });

    it('should maintain 2 decimal places for small numbers', () => {
      expect(pipe.transform(123.1)).toBe('123.10');
      expect(pipe.transform(123.456)).toBe('123.46'); // Should round
    });
  });
});
