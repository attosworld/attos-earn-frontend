import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StrategyV2 } from '../strategies.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-yield-list',
  imports: [CommonModule],
  templateUrl: './yield-list.component.html',
  styleUrl: './yield-list.component.css',
})
export class YieldListComponent {
  @Input() category!: string;
  @Input() isCollapsed = false;
  @Input() strategies!: StrategyV2[] | null;
  @Input() tvl!: string | number | null;

  @Output()
  collapseToggle = new EventEmitter<string>();

  toggleStrategySection(): void {
    this.collapseToggle.emit(this.category);
  }
}
