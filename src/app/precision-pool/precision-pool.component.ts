import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NumberFormatPipe } from '../number-format.pipe';

type RangeTypes = 'wide' | 'concentrated' | 'bold' | 'manual';

@Component({
  selector: 'app-precision-pool',
  imports: [CommonModule, FormsModule, NumberFormatPipe],
  templateUrl: './precision-pool.component.html',
  styleUrl: './precision-pool.component.css',
})
export class PrecisionPoolComponent implements OnInit, OnChanges {
  @Input() symbol?: string = '';
  @Input() currentPrice: number | null = 0;
  @Input() precisionPrice: number | null = 0;
  @Output() minValueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();

  inputAmount = 0;
  sliderMin = -90;
  sliderMax = 900;
  minValue = -90;
  maxValue = 900;
  lowPrice = 0;
  highPrice = 0;
  selectedPriceRange: RangeTypes = 'wide';

  ranges: RangeTypes[] = ['wide', 'concentrated', 'bold', 'manual'];

  @Output()
  pricePreviewData = new EventEmitter<{
    currentPrice: number;
    minValue: number;
    maxValue: number;
  }>();

  ngOnInit() {
    this.calculatePriceRange();
  }

  ngOnChanges() {
    this.calculatePriceRange();
  }

  setPriceRange(range: RangeTypes) {
    this.selectedPriceRange = range;
    switch (range) {
      case 'wide':
        this.minValue = -90;
        this.maxValue = 900;
        break;
      case 'concentrated':
        this.minValue = -50;
        this.maxValue = 100;
        break;
      case 'bold':
        this.minValue = -20;
        this.maxValue = 25;
        break;
      case 'manual':
        // Do nothing, allow user to adjust
        break;
    }
    this.updatePriceRange();
  }

  updatePriceRange() {
    if (this.minValue > this.maxValue) {
      const temp = this.minValue;
      this.minValue = this.maxValue;
      this.maxValue = temp;
    }

    if (this.selectedPriceRange !== 'manual') {
      if (this.minValue === -90 && this.maxValue === 900) {
        this.selectedPriceRange = 'wide';
      } else if (this.minValue === -50 && this.maxValue === 100) {
        this.selectedPriceRange = 'concentrated';
      } else if (this.minValue === -20 && this.maxValue === 25) {
        this.selectedPriceRange = 'bold';
      } else {
        this.selectedPriceRange = 'manual';
      }
    }

    this.calculatePriceRange();
    this.minValueChange.emit(this.minValue);
    this.maxValueChange.emit(this.maxValue);
  }

  calculatePriceRange() {
    if (this.currentPrice && this.precisionPrice) {
      this.lowPrice = +this.currentPrice * (1 + this.minValue / 100);
      this.highPrice = +this.currentPrice * (1 + this.maxValue / 100);

      this.pricePreviewData.emit({
        currentPrice: this.currentPrice,
        minValue: this.minValue,
        maxValue: this.maxValue,
      });
    }
  }
}
