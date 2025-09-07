import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PortfolioItem } from '../portfolio.service';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { ShortenAddressPipe } from '../shorten-address.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-item',
  imports: [PoolIconPairComponent, ShortenAddressPipe, CommonModule],
  templateUrl: './portfolio-item.component.html',
  styleUrl: './portfolio-item.component.css',
})
export class PortfolioItemComponent {
  @Input()
  item!: PortfolioItem;

  @Input()
  pendingState = false;

  @Output()
  closeStrategy = new EventEmitter<PortfolioItem>();

  close(portfolioItem: PortfolioItem) {
    this.closeStrategy.emit(portfolioItem);
  }
}
