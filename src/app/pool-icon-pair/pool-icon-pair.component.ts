import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-pool-icon-pair',
  standalone: true,
  imports: [],
  templateUrl: './pool-icon-pair.component.html',
  styleUrls: ['./pool-icon-pair.component.css'],
})
export class PoolIconPairComponent {
  @Input() leftIcon?: string;
  @Input() rightIcon?: string;
  @Input() leftAlt?: string;
  @Input() rightAlt?: string;
}
