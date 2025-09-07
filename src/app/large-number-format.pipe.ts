import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'largeNumberFormat',
  standalone: true,
})
export class LargeNumberFormatPipe implements PipeTransform {
  private static readonly abbreviations = [
    '',
    'M',
    'B',
    'T',
    'Q',
    'Qi',
    'S',
    'Sp',
    'O',
    'N',
    'D',
    'Ud',
    'Dd',
    'Td',
    'Qd',
    'Qid',
    'Sd',
    'Spd',
    'Od',
    'Nd',
    'V',
    'Uv',
    'Dv',
    'Tv',
    'Qv',
    'Qiv',
    'Sv',
    'Spv',
    'Ov',
    'Nv',
    'Tg',
  ];

  transform(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';

    if (absNum < 1000000) {
      return sign + this.formatDecimal(absNum);
    }

    const tier = Math.floor(Math.log10(absNum) / 3);
    const abbreviationIndex = Math.min(
      tier - 1,
      LargeNumberFormatPipe.abbreviations.length - 1
    );
    const scaledNum = absNum / Math.pow(1000, tier);
    const abbreviation = LargeNumberFormatPipe.abbreviations[abbreviationIndex];

    return sign + scaledNum.toFixed(2) + abbreviation;
  }

  private formatDecimal(value: number): string {
    const fixed = value.toFixed(2);
    const [integerPart, decimalPart] = fixed.split('.');
    const formattedIntegerPart = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ','
    );
    return `${formattedIntegerPart}.${decimalPart}`;
  }
}
