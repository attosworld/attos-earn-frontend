
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ChartType = 'volume' | 'performance' | 'liquidity';

@Component({
  selector: 'app-chart-toggle',
  imports: [],
  templateUrl: './chart-toggle.component.html',
  styleUrl: './chart-toggle.component.css',
})
export class ChartToggleComponent {
  @Input() selectedType: ChartType = 'volume';
  @Input() liquidityEnabled = false;
  @Input() lpPerformanceEnabled!: boolean;
  @Output() typeChange = new EventEmitter<ChartType>();

  selectChart(type: ChartType): void {
    this.selectedType = type;
    this.typeChange.emit(type);
  }
}
