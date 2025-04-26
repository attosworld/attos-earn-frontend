import { Component, Input, OnInit } from '@angular/core';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-animated-counter',
  standalone: true,
  imports: [],
  template: '{{ displayValue }}',
  styles: [],
})
export class AnimatedCounterComponent implements OnInit {
  @Input() endValue = 0;
  @Input() duration = 2000; // Duration in milliseconds
  displayValue = 0;

  ngOnInit() {
    const threshold = 20; // Threshold for small numbers
    const steps = 60;

    if (this.endValue < threshold) {
      // For small numbers, increment by 1
      const interval = this.duration / this.endValue;
      timer(0, interval)
        .pipe(take(this.endValue))
        .subscribe(() => {
          this.displayValue = Math.min(this.displayValue + 1, this.endValue);
        });
    } else {
      // For larger numbers, use the original approach
      const step = Math.ceil(this.endValue / steps);
      timer(0, this.duration / steps)
        .pipe(take(steps))
        .subscribe(() => {
          this.displayValue = Math.min(this.displayValue + step, this.endValue);
        });
    }
  }
}
