import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject, map, Observable, takeWhile, timer } from 'rxjs';

@Component({
  selector: 'app-animated-counter',
  imports: [CommonModule],
  templateUrl: './animated-counter.component.html',
  styleUrl: './animated-counter.component.css',
})
export class AnimatedCounterComponent implements OnInit {
  @Input() endValue = 0;
  @Input() duration = 2000; // Duration in milliseconds

  private counterSubject = new BehaviorSubject<number>(0);
  displayValue$: Observable<number> = this.counterSubject.asObservable();

  ngOnInit() {
    const threshold = 20; // Threshold for small numbers
    const steps = 60;

    if (this.endValue < threshold) {
      // For small numbers, increment by 1
      const interval = this.duration / this.endValue;
      this.animateCounter(interval, 1);
    } else {
      // For larger numbers, use the original approach
      const step = Math.ceil(this.endValue / steps);
      const interval = this.duration / steps;
      this.animateCounter(interval, step);
    }
  }

  private animateCounter(interval: number, step: number) {
    timer(0, interval)
      .pipe(
        map(i => Math.min((i + 1) * step, this.endValue)),
        takeWhile(val => val <= this.endValue, true)
      )
      .subscribe(value => this.counterSubject.next(value));
  }
}
