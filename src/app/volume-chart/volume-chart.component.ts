import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-volume-chart',
  imports: [CurrencyPipe, CommonModule],
  templateUrl: './volume-chart.component.html',
  styleUrl: './volume-chart.component.css',
})
export class VolumeChartComponent {
  @Input() sevenDayVolume!: Record<string, number> | null;
  maxVolume = 0;
  lastSevenDays: Date[] = [];

  calculateMaxVolume(volumes: Record<string, number>) {
    this.maxVolume = Math.max(...Object.values(volumes));
    this.maxVolume = Math.ceil(this.maxVolume / 1000) * 1000;
  }

  generateLastSevenDays(volumes: Record<string, number>) {
    return Object.keys(volumes).map(date => new Date(date));
  }

  getVolumes(volumes: Record<string, number>): number[] {
    return Object.values(volumes);
  }
}
