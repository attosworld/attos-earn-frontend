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
  share,
} from 'rxjs/operators';
import Fuse from 'fuse.js';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { PortfolioService, PortfolioItem } from '../portfolio.service';
import { RadixConnectService } from '../radix-connect.service';
import { TransactionStatus } from '@radixdlt/radix-dapp-toolkit';
import { ShortenAddressPipe } from '../shorten-address.pipe';

type PortfolioFilterableColumns = keyof Omit<
  PortfolioItem,
  | 'strategy'
  | 'loanAmount'
  | 'loanCurrency'
  | 'borrowAmount'
  | 'borrowCurrency'
  | 'tx'
>;

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoolIconPairComponent,
    ShortenAddressPipe,
  ],
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
  totalInvested = 0;
  totalCurrentValue = 0;
  totalPnl = 0;
  totalPnlPercentage = 0;
  closingItems: Record<string, boolean> = {};
  // Add this property to your class
  isFaqSectionOpen = false;

  // New property to store all portfolio items
  allPortfolioItems: PortfolioItem[] = [];

  radixConnectService = inject(RadixConnectService);

  txButtonStatus = this.radixConnectService.getButtonStatus();
  transactionResult: Observable<TransactionStatus | undefined> = of(undefined);

  private sortSubject = new BehaviorSubject<{
    column: PortfolioFilterableColumns | null;
    direction: 'asc' | 'desc' | 'none';
  }>({
    column: null,
    direction: 'none',
  });

  sort$ = this.sortSubject.asObservable();

  portfolioService = inject(PortfolioService);

  faqs = [
    {
      question: "Why can't I close my strategy sometimes?",
      answer: `
        There are a few reasons why you might not be able to close your strategy:
        <ul class="list-disc pl-5 mt-2">
          <li>The position cannot repay the loan due to market conditions or insufficient funds.</li>
          <li>The market has moved since you attempted to close, making the transaction unfavorable or impossible.</li>
          <li>There might be temporary liquidity issues in the pool.</li>
        </ul>
        <p class="mt-2">These are normal occurrences in dynamic markets. If you encounter this issue, wait for a short while and try again when market conditions are more favorable.</p>
      `,
      isOpen: false,
    },
    {
      question: 'How are strategies closed?',
      answer:
        'Strategies are closed using XRD (the native token of the Radix network) through Ociswap, a decentralized exchange on the Radix network. This ensures efficient and decentralized settlement of your positions.',
      isOpen: false,
    },
    {
      question: 'What is an epoch in the context of strategies?',
      answer:
        'In the context of our strategies, an epoch refers to the specific time when a strategy was executed. It marks the starting point of your investment in that particular strategy.',
      isOpen: false,
    },
  ];

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
            this.portfolioService.getPortfolioItems(account.address)
          )
        ).pipe(
          map(itemArrays => itemArrays.flat()),
          tap(items => {
            this.allPortfolioItems = items;
            this.calculateTotals(items);
          }),
          finalize(() => (this.isLoading = false)),
          share()
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
      share()
    );
  }

  // New method to calculate totals
  private calculateTotals(items: PortfolioItem[]) {
    this.totalInvested = items.reduce((sum, item) => sum + +item.invested, 0);
    this.totalCurrentValue = items.reduce(
      (sum, item) => sum + +item.currentValue,
      0
    );
    this.totalPnl = this.totalCurrentValue - this.totalInvested;
    this.totalPnlPercentage = (this.totalPnl / this.totalInvested) * 100;
  }

  sortPortfolioItems(column: PortfolioFilterableColumns) {
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
      column: PortfolioFilterableColumns | null;
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
        return +a[sort.column] < +b[sort.column] ? -1 : 1;
      } else {
        return +b[sort.column] < +a[sort.column] ? -1 : 1;
      }
    });
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  async closeStrategy(item: PortfolioItem) {
    this.closingItems[item.poolName] = true;
    try {
      const response = await this.radixConnectService.sendTransaction(
        item.closeManifest
      );
      if (response?.isOk()) {
        this.transactionResult = of(response.value.status);
      } else {
        this.transactionResult = of(TransactionStatus.Rejected);
      }
    } finally {
      this.closingItems[item.poolName] = false;
    }
  }

  toggleFaq(index: number) {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  // Add this method to your class
  toggleFaqSection() {
    this.isFaqSectionOpen = !this.isFaqSectionOpen;
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
