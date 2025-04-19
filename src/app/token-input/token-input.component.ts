import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-token-input',
  templateUrl: './token-input.component.html',
  styleUrls: ['./token-input.component.css'],
  imports: [CommonModule],
})
export class TokenInputComponent {
  @Input() tokenSymbol = '';
  @Input() tokenAddress = '';
  @Input() amount = '';
  @Input() maxAmount?: string;
  @Input() error = '';

  @Output() amountChange = new EventEmitter<string>();
  @Output() setMax = new EventEmitter<string>();

  updateAmount(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.amountChange.emit(value);
  }

  setMaxBalance() {
    this.setMax.emit(this.tokenAddress);
  }
}
