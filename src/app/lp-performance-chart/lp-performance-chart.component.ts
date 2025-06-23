import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-lp-performance-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lp-performance-chart.component.html',
  styleUrl: './lp-performance-chart.component.css',
})
export class LpPerformanceChartComponent implements OnChanges {
  @Input() tokenValueData!: Record<string, number> | null;

  // Chart data
  chartPoints = '';
  chartValues: number[] = [];
  chartDates: Date[] = [];

  // Y-axis scaling
  maxValue = 0;
  minValue = 0;
  maxYAxisValue = 0;
  minYAxisValue = 0;
  yAxisRange = 0;

  // Configuration
  yAxisPadding = 0.1; // 10% padding above and below data range

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tokenValueData'] && this.tokenValueData) {
      // Sort the data by date
      const sortedEntries = Object.entries(this.tokenValueData).sort(
        ([dateA], [dateB]) =>
          new Date(dateA).getTime() - new Date(dateB).getTime()
      );

      // Extract sorted values and dates
      this.chartValues = sortedEntries.map(([_, value]) => value);
      this.chartDates = sortedEntries.map(([date]) => new Date(date));

      // Calculate min and max values for scaling
      this.calculateYAxisRange();

      // Generate the SVG points for the line
      this.generateChartPoints();
    }
  }

  calculateYAxisRange() {
    if (this.chartValues.length === 0) {
      this.minValue = 0;
      this.maxValue = 100;
      this.minYAxisValue = 0;
      this.maxYAxisValue = 100;
      this.yAxisRange = 100;
      return;
    }

    this.minValue = Math.min(...this.chartValues);
    this.maxValue = Math.max(...this.chartValues);

    // Calculate range with padding
    const range = this.maxValue - this.minValue;
    const padding = range * this.yAxisPadding;

    // If the range is very small, add more padding for better visualization
    const effectivePadding =
      range < this.maxValue * 0.05 ? this.maxValue * 0.05 : padding;

    this.minYAxisValue = Math.max(0, this.minValue - effectivePadding); // Don't go below 0
    this.maxYAxisValue = this.maxValue + effectivePadding;
    this.yAxisRange = this.maxYAxisValue - this.minYAxisValue;
  }

  getYAxisValue(percentage: number): number {
    return this.minYAxisValue + this.yAxisRange * percentage;
  }

  generateChartPoints() {
    if (this.chartValues.length <= 1) {
      this.chartPoints = '';
      return;
    }

    const points = this.chartValues.map((value, index) => {
      const x = index * (100 / (this.chartValues.length - 1));
      // Scale y value based on the adjusted min/max range
      const y = 100 - ((value - this.minYAxisValue) / this.yAxisRange) * 100;
      return `${x},${y}`;
    });

    this.chartPoints = points.join(' ');
  }

  getPointX(index: number): number {
    if (this.chartValues.length <= 1) return 0;
    return index * (100 / (this.chartValues.length - 1));
  }

  getPointY(value: number): number {
    // Scale y value based on the adjusted min/max range
    return 100 - ((value - this.minYAxisValue) / this.yAxisRange) * 100;
  }

  // Get a subset of dates to display on the x-axis to avoid overcrowding
  getDisplayDates(): Date[] {
    if (this.chartDates.length <= 5) return this.chartDates;

    const result: Date[] = [];
    const step = Math.floor(this.chartDates.length / 5);

    // Always include first and last date
    result.push(this.chartDates[0]);

    // Add evenly spaced dates in between
    for (let i = step; i < this.chartDates.length - step; i += step) {
      result.push(this.chartDates[i]);
    }

    // Add the last date
    result.push(this.chartDates[this.chartDates.length - 1]);

    return result;
  }

  getFirstValue(): number {
    return this.chartValues.length > 0 ? this.chartValues[0] : 0;
  }

  getLastValue(): number {
    return this.chartValues.length > 0
      ? this.chartValues[this.chartValues.length - 1]
      : 0;
  }

  getPercentChange(): number {
    if (this.chartValues.length < 2 || this.getFirstValue() === 0) return 0;

    const firstValue = this.getFirstValue();
    const lastValue = this.getLastValue();

    return ((lastValue - firstValue) / firstValue) * 100;
  }
}
