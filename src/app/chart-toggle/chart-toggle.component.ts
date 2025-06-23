import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ChartType = 'volume' | 'performance';

@Component({
  selector: 'app-chart-toggle',
  imports: [CommonModule],
  templateUrl: './chart-toggle.component.html',
  styleUrl: './chart-toggle.component.css',
})
export class ChartToggleComponent {
  @Input() selectedType: ChartType = 'volume';
  @Input() lpPerformanceEnabled!: boolean;
  @Output() typeChange = new EventEmitter<ChartType>();

  selectChart(type: ChartType): void {
    this.selectedType = type;
    this.typeChange.emit(type);
  }
}
