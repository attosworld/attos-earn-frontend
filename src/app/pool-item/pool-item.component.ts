import { Component, Input } from '@angular/core';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { Pool } from '../pool.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-pool-item',
  imports: [PoolIconPairComponent, CurrencyPipe, DecimalPipe],
  templateUrl: './pool-item.component.html',
  styleUrl: './pool-item.component.css',
})
export class PoolItemComponent {
  @Input() pool!: Pool;
}
