import { Component, Input } from '@angular/core';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { Pool } from '../pool.service';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-pool-item',
  imports: [PoolIconPairComponent, CurrencyPipe, DecimalPipe, CommonModule],
  templateUrl: './pool-item.component.html',
  styleUrl: './pool-item.component.css',
})
export class PoolItemComponent {
  @Input() pool!: Pool;
}
