import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pool } from '../pool.service';
import {
  RadixConnectService,
  ResourceRoleAndInfo,
} from '../radix-connect.service';
import { TokenDetailsComponent } from '../token-details/token-details.component';

@Component({
  selector: 'app-pool-details',
  imports: [CommonModule, TokenDetailsComponent],
  templateUrl: './pool-details.component.html',
  styleUrls: ['./pool-details.component.css'],
})
export class PoolDetailsComponent implements OnInit {
  @Input() poolInfo?: Pool | null;
  copied = false;
  showTokenDetails = false;

  radixConnectService = inject(RadixConnectService);

  tokenDetails$ =
    this.poolInfo &&
    this.radixConnectService.getTokenDetails([
      this.poolInfo?.left_token,
      this.poolInfo?.right_token,
    ]);

  ngOnInit() {
    this.tokenDetails$ =
      this.poolInfo &&
      this.radixConnectService.getTokenDetails([
        this.poolInfo?.left_token,
        this.poolInfo?.right_token,
      ]);
  }

  flagProps: (keyof Omit<ResourceRoleAndInfo, 'metadata'>)[] = [
    'mintable',
    'burnable',
    'withdrawable',
    'depositable',
  ];

  async copy(address: string) {
    await navigator.clipboard.writeText(address).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  toggleTokenDetails() {
    this.showTokenDetails = !this.showTokenDetails;
  }

  getHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}
