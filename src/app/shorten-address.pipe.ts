import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortenAddress',
})
export class ShortenAddressPipe implements PipeTransform {
  transform(value: string): unknown {
    if (!value) return '';

    return value.slice(0, 6) + '...' + value.slice(-4);
  }
}
