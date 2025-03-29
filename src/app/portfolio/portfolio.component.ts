import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  map,
  shareReplay,
  finalize,
  debounceTime,
  switchMap,
  tap,
} from 'rxjs/operators';
import Fuse from 'fuse.js';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { PortfolioService, PortfolioItem } from '../portfolio.service';
import { RadixConnectService } from '../radix-connect.service';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, PoolIconPairComponent],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
})
export class PortfolioComponent implements OnInit {
  portfolioItems$: Observable<PortfolioItem[]> = of([]);
  sortedPortfolioItems$: Observable<PortfolioItem[]> = of([]);
  isLoading = true;
  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable().pipe(debounceTime(300));

  private sortSubject = new BehaviorSubject<{
    column: keyof PortfolioItem | null;
    direction: 'asc' | 'desc' | 'none';
  }>({
    column: null,
    direction: 'none',
  });
  sort$ = this.sortSubject.asObservable();

  portfolioService = inject(PortfolioService);
  radixConnectService = inject(RadixConnectService);

  ngOnInit() {
    this.portfolioItems$ = (
      this.radixConnectService.getAccounts() || of([])
    ).pipe(
      switchMap(accounts => {
        if (!accounts || !accounts.length) {
          return of([]).pipe(
            finalize(() => (this.isLoading = false)),
            shareReplay(1)
          );
        }

        return combineLatest(
          accounts.map(account =>
            this.portfolioService.getPortfolioItems(account)
          )
        ).pipe(
          map(itemArrays => itemArrays.flat()),
          tap(res => console.log(res)),
          finalize(() => (this.isLoading = false)),
          shareReplay(1)
        );
      })
    );

    this.sortedPortfolioItems$ = combineLatest([
      this.portfolioItems$,
      this.sort$,
      this.search$,
    ]).pipe(
      map(([items, sort, searchTerm]) => {
        const filteredItems = this.searchPortfolioItems(items, searchTerm);
        return this.sortPortfolioItemsByColumn(filteredItems, sort);
      }),
      shareReplay(1)
    );
  }

  sortPortfolioItems(column: keyof PortfolioItem) {
    const currentSort = this.sortSubject.value;
    let newDirection: 'asc' | 'desc' | 'none' = 'asc';

    if (currentSort.column === column) {
      if (currentSort.direction === 'asc') newDirection = 'desc';
      else if (currentSort.direction === 'desc') newDirection = 'none';
    }

    this.sortSubject.next({
      column: newDirection === 'none' ? null : column,
      direction: newDirection,
    });
  }

  private sortPortfolioItemsByColumn(
    items: PortfolioItem[],
    sort: {
      column: keyof PortfolioItem | null;
      direction: 'asc' | 'desc' | 'none';
    }
  ): PortfolioItem[] {
    if (sort.direction === 'none' || !sort.column) {
      return items;
    }
    return [...items].sort((a, b) => {
      if (!sort.column) {
        return 0;
      }
      if (sort.direction === 'asc') {
        return a[sort.column] < b[sort.column] ? -1 : 1;
      } else {
        return b[sort.column] < a[sort.column] ? -1 : 1;
      }
    });
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  private searchPortfolioItems(
    items: PortfolioItem[],
    term: string
  ): PortfolioItem[] {
    if (!term) return items;

    const fuse = new Fuse(items, {
      keys: ['poolName'],
      threshold: 0.3,
    });

    return fuse.search(term).map(result => result.item);
  }
}
