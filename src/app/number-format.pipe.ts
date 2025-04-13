import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberFormat',
  standalone: true,
})
export class NumberFormatPipe implements PipeTransform {
  transform(value?: number | string): string {
    if (!value) return '0';

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) return 'N/A';

    if (num >= 1e9) return num.toExponential(2);
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';

    return num.toFixed(5);
  }
}
