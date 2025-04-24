import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { Pool } from '../pool.service';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { LargeNumberFormatPipe } from '../large-number-format.pipe';

@Component({
  selector: 'app-pool-item',
  imports: [
    PoolIconPairComponent,
    CurrencyPipe,
    DecimalPipe,
    LargeNumberFormatPipe,
    CommonModule,
  ],
  templateUrl: './pool-item.component.html',
  styleUrls: ['./pool-item.component.css'],
})
export class PoolItemComponent {
  @Input() pool!: Pool;
  @Output() depositClicked = new EventEmitter<Pool>();

  openDepositModal() {
    this.depositClicked.emit(this.pool);
  }
}
