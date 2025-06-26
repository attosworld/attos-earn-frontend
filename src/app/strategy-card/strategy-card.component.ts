import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StrategyV2 } from '../strategies.service';

@Component({
  selector: 'app-strategy-card',
  imports: [CommonModule],
  templateUrl: './strategy-card.component.html',
  styleUrl: './strategy-card.component.css',
})
export class StrategyCardComponent {
  @Input() strategies!: StrategyV2[] | null;
}
