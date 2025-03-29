import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PoolItemComponent } from '../pool-item/pool-item.component';
import { PoolService, Pool } from '../pool.service';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, shareReplay, finalize, debounceTime } from 'rxjs/operators';
import Fuse from 'fuse.js';

type SortColumn = 'tvl' | 'bonus_7d' | 'volume_7d' | null;
type SortDirection = 'asc' | 'desc' | 'none';
type PoolType = 'all' | 'double' | 'single';

interface SortEvent {
  column: SortColumn;
  direction: SortDirection;
}

@Component({
  selector: 'app-pool-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PoolItemComponent],
  providers: [PoolService],
  templateUrl: './pool-list.component.html',
  styleUrl: './pool-list.component.css',
})
export class PoolListComponent {
  private sortSubject = new BehaviorSubject<SortEvent>({
    column: null,
    direction: 'none',
  });
  sort$ = this.sortSubject.asObservable();

  pools$: Observable<Pool[]>;
  sortedPools$: Observable<Pool[]>;
  isLoading = true;

  private selectedTabSubject = new BehaviorSubject<PoolType>('all');
  selectedTab$ = this.selectedTabSubject.asObservable();

  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable().pipe(debounceTime(300));

  constructor(private poolService: PoolService) {
    this.pools$ = this.poolService.getPools().pipe(
      finalize(() => (this.isLoading = false)),
      shareReplay(1)
    );

    this.sortedPools$ = combineLatest([
      this.pools$,
      this.sort$,
      this.search$,
      this.selectedTab$,
    ]).pipe(
      map(([pools, sort, searchTerm, selectedTab]) => {
        let filteredPools = this.filterPoolsByType(pools, selectedTab);
        filteredPools = this.searchPools(filteredPools, searchTerm);
        return this.sortBasedOnEvent(filteredPools, sort);
      }),
      shareReplay(1)
    );
  }

  sortPools(column: SortColumn) {
    const currentSort = this.sortSubject.value;
    let newDirection: SortDirection = 'asc';

    if (currentSort.column === column) {
      if (currentSort.direction === 'asc') newDirection = 'desc';
      else if (currentSort.direction === 'desc') newDirection = 'none';
    }

    this.sortSubject.next({
      column: newDirection === 'none' ? null : column,
      direction: newDirection,
    });
  }

  private sortBasedOnEvent(pools: Pool[], sort: SortEvent): Pool[] {
    if (sort.direction === 'none' || !sort.column) {
      return pools; // Return unsorted array
    }
    return [...pools].sort((a, b) => {
      if (!sort.column) {
        return 0;
      }

      if (sort.direction === 'asc') {
        return a[sort.column] - b[sort.column];
      } else {
        return b[sort.column] - a[sort.column];
      }
    });
  }

  selectTab(tab: PoolType) {
    this.selectedTabSubject.next(tab);
  }

  private filterPoolsByType(pools: Pool[], selectedTab: PoolType): Pool[] {
    if (selectedTab === 'all') {
      return pools;
    }
    return pools.filter(pool => pool.pool_type === selectedTab);
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  private searchPools(pools: Pool[], term: string): Pool[] {
    if (!term) return pools;

    const fuse = new Fuse(pools, {
      keys: ['name', 'left_alt', 'right_alt'],
      threshold: 0.3,
    });

    return fuse.search(term).map(result => result.item);
  }
}
