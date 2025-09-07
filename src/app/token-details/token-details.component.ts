import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ResourceRoleAndInfo } from '../radix-connect.service';

@Component({
  selector: 'app-token-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './token-details.component.html',
  styleUrls: ['./token-details.component.css'],
})
export class TokenDetailsComponent {
  @Input() tokenDetails!: ResourceRoleAndInfo;
  @Input() tokenName?: string = '';
  @Input() tokenAddress?: string = '';

  flagProps: (keyof ResourceRoleAndInfo)[] = [
    'mintable',
    'burnable',
    'withdrawable',
    'depositable',
  ];
  copied = false;

  copy(address?: string) {
    navigator.clipboard.writeText(address || '').then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  getHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}
