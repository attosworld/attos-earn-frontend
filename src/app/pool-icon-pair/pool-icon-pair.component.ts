import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pool-icon-pair',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pool-icon-pair.component.html',
  styleUrls: ['./pool-icon-pair.component.css'],
})
export class PoolIconPairComponent {
  @Input() leftIcon = '';
  @Input() rightIcon = '';
  @Input() leftAlt = '';
  @Input() rightAlt = '';
}
