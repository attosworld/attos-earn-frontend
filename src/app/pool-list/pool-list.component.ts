import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
  inject,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { PoolItemComponent } from '../pool-item/pool-item.component';
import { PoolService, Pool } from '../pool.service';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import {
  map,
  shareReplay,
  finalize,
  debounceTime,
  switchMap,
  tap,
  catchError,
} from 'rxjs/operators';
import Fuse from 'fuse.js';
import { PrecisionPoolComponent } from '../precision-pool/precision-pool.component';
import { Decimal } from 'decimal.js';
import { RadixConnectService } from '../radix-connect.service';
import { AddLiquidityPreview, OciswapService } from '../ociswap.service';
import { RadixManifestService } from '../radix-manifest.service';
import { TransactionStatus } from '@radixdlt/radix-dapp-toolkit';
import { TokenInputComponent } from '../token-input/token-input.component';
import { PoolDetailsComponent } from '../pool-details/pool-details.component';

type SortColumn = 'tvl' | 'bonus_7d' | 'volume_7d' | null;
type SortDirection = 'asc' | 'desc' | 'none';
type PoolType = 'all' | 'double' | 'single' | 'boosted';

interface SortEvent {
  column: SortColumn;
  direction: SortDirection;
}

interface Filter {
  condition: 'above' | 'below';
  value: number | null;
}

interface Filters {
  tvl: Filter;
  bonus: Filter;
  volume: Filter;
}

@Component({
  selector: 'app-pool-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    PoolItemComponent,
    PrecisionPoolComponent,
    TokenInputComponent,
    PoolDetailsComponent,
  ],
  providers: [PoolService],
  templateUrl: './pool-list.component.html',
  styleUrls: ['./pool-list.component.css'],
})
export class PoolListComponent implements AfterViewInit, OnInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  @ViewChild('dummyItem') dummyItem!: ElementRef;

  sevenDayVolume$: Observable<number[]> | undefined;

  cdRef = inject(ChangeDetectorRef);
  sevenDayVolume: number[] = [3000, 5000, 2000, 8000, 6500, 4500, 7000];
  maxVolume = 0;
  lastSevenDays: Date[] = [];

  ngOnInit() {
    this.generateLastSevenDays();
  }

  // Update these methods to work with the Observable
  calculateMaxVolume(volumes: number[]) {
    this.maxVolume = Math.max(...volumes);
    this.maxVolume = Math.ceil(this.maxVolume / 1000) * 1000;
  }

  generateLastSevenDays() {
    const today = new Date();
    this.lastSevenDays = Array(7)
      .fill(null)
      .map((_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        return date;
      })
      .reverse();
  }

  private sortSubject = new BehaviorSubject<SortEvent>({
    column: null,
    direction: 'none',
  });
  sort$ = this.sortSubject.asObservable();

  isLoading = true;

  private selectedTabSubject = new BehaviorSubject<PoolType>('all');
  selectedTab$ = this.selectedTabSubject.asObservable();

  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable().pipe(debounceTime(300));

  showBonusInfo = false;

  itemSize = 60; // Estimated height of each pool item

  isMobile!: boolean;

  xAmount = '';

  yAmount = '';

  maxAmounts: Record<string, string> = {};

  inputErrors: Record<string, string> = {};

  tvlFilter: Filter = { condition: 'above', value: null };
  bonusFilter: Filter = { condition: 'above', value: null };
  volumeFilter: Filter = { condition: 'above', value: null };

  private filtersSubject = new BehaviorSubject<Filters>({
    tvl: this.tvlFilter,
    bonus: this.bonusFilter,
    volume: this.volumeFilter,
  });
  filters$ = this.filtersSubject.asObservable();
  selectedPool: Pool | null = null;
  showModal = false;
  minValue = -90;
  maxValue = 900;

  ociswapService = inject(OciswapService);

  radixManifestService = inject(RadixManifestService);

  poolService = inject(PoolService);

  radixConnectService = inject(RadixConnectService);

  txButtonStatus = this.radixConnectService.getButtonStatus();

  transactionResult?: Observable<TransactionStatus | undefined> = of(undefined);

  addLiquidityPreview: Observable<AddLiquidityPreview | null> = of(null);

  pools$ = this.poolService.getPools().pipe(
    finalize(() => {
      this.isLoading = false;
      setTimeout(() => this.updateItemSize(), 32);
    }),
    shareReplay(1)
  );

  sortedPools$ = combineLatest([
    this.pools$,
    this.sort$,
    this.search$,
    this.selectedTab$,
    this.filters$,
  ]).pipe(
    map(([pools, sort, searchTerm, selectedTab, filters]) => {
      let filteredPools = this.filterPoolsByType(pools, selectedTab);
      filteredPools = this.searchPools(filteredPools, searchTerm);
      filteredPools = this.applyAdvancedFilters(filteredPools, filters);
      return this.sortBasedOnEvent(filteredPools, sort);
    }),
    shareReplay(1)
  );

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
    switch (selectedTab) {
      case 'all':
        return pools;
      case 'boosted':
        return pools.filter(pool => pool.boosted);
      default:
        return pools.filter(pool => pool.pool_type === selectedTab);
    }
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

  sortPoolsMobile(event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (!value) return;

    const [column, direction] = value.split('-');
    this.sortSubject.next({
      column: column as SortColumn,
      direction: direction as SortDirection,
    });
  }

  ngAfterViewInit() {
    this.updateItemSize();
    this.cdRef.detectChanges();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
    this.updateItemSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // Adjust this breakpoint as needed
  }

  updateItemSize() {
    if (this.dummyItem) {
      this.itemSize = this.dummyItem.nativeElement.offsetHeight;
      if (this.viewport) {
        this.viewport.checkViewportSize();
      }
    }
  }

  private applyAdvancedFilters(pools: Pool[], filters: Filters): Pool[] {
    return pools.filter(pool => {
      const tvlMatch = this.applyNumericFilter(pool.tvl, filters.tvl);
      const bonusMatch = this.applyNumericFilter(pool.bonus_7d, filters.bonus);
      const volumeMatch = this.applyNumericFilter(
        pool.volume_7d,
        filters.volume
      );
      return tvlMatch && bonusMatch && volumeMatch;
    });
  }

  private applyNumericFilter(value: number, filter: Filter): boolean {
    if (filter.value === null) return true;
    return filter.condition === 'above'
      ? value >= filter.value
      : value <= filter.value;
  }

  applyFilters(): void {
    this.filtersSubject.next({
      tvl: this.tvlFilter,
      bonus: this.bonusFilter,
      volume: this.volumeFilter,
    });
  }

  updateMinValue(minValue: number) {
    this.minValue = minValue;

    this.updateAmount();
  }

  updateMaxValue(maxValue: number) {
    this.maxValue = maxValue;

    this.updateAmount();
  }

  private updateAmount() {
    if (this.selectedPool) {
      const { lowerTick, upperTick } = this.ociswapService.calculateTickBounds(
        this.selectedPool.current_price,
        this.minValue,
        this.maxValue,
        60
      );
      this.addLiquidityPreview = this.ociswapService
        .getOciswapAddLiquidityPreview(
          this.selectedPool.component,
          this.xAmount,
          '',
          lowerTick.toString(),
          upperTick.toString()
        )
        .pipe(
          tap(data => {
            if (data) {
              this.xAmount = data.x_amount.token;
              this.yAmount = data.y_amount.token;
            }
          }),
          catchError(() => {
            this.inputErrors[this.selectedPool?.right_token || ''] =
              'An error occurred while fetching add liquidity preview.';
            return of(null);
          })
        );
    }
  }
  openDepositModal(pool: Pool) {
    this.selectedPool = pool;
    this.showModal = true;
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
    this.updateMaxAmounts();

    // Fetch the seven-day volume data
    this.sevenDayVolume$ = this.poolService
      .getPoolVolumePerDay(pool.component, pool.type)
      .pipe(map(volumeData => volumeData.volume_per_day));

    // Reset maxVolume and lastSevenDays
    this.maxVolume = 0;
    this.lastSevenDays = [];
  }

  closeModal() {
    this.showModal = false;
    this.selectedPool = null;
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
  }

  updateMaxAmounts() {
    if (this.selectedPool) {
      this.radixConnectService.getWalletData()?.subscribe(walletData => {
        if (walletData && this.selectedPool) {
          this.maxAmounts[this.selectedPool.left_token] =
            walletData.fungibles.find(
              f =>
                f.resourceInfo.resourceAddress === this.selectedPool?.left_token
            )?.balance || '0';
          this.maxAmounts[this.selectedPool.right_token] =
            walletData.fungibles.find(
              f =>
                f.resourceInfo.resourceAddress ===
                this.selectedPool?.right_token
            )?.balance || '0';
        }
      });
    }
  }

  setMaxBalance(resourceAddress: string) {
    const maxAmount = this.maxAmounts[resourceAddress];
    if (this.selectedPool) {
      if (resourceAddress === this.selectedPool.left_token) {
        this.xAmount = maxAmount.toString();
        this.yAmount =
          this.selectedPool?.type === 'defiplaza'
            ? new Decimal(this.xAmount)
                .mul(this.selectedPool.xRatio || 0)
                .toFixed(18)
            : new Decimal(this.xAmount)
                .mul(this.selectedPool?.current_price || 0)
                .toFixed(18);
      } else if (resourceAddress === this.selectedPool.right_token) {
        this.yAmount = maxAmount.toString();
        this.xAmount =
          this.selectedPool?.type === 'defiplaza'
            ? new Decimal(this.yAmount)
                .div(this.selectedPool.yRatio || 0)
                .toFixed(18)
            : new Decimal(this.yAmount)
                .div(
                  new Decimal(this.selectedPool?.current_price || 0).plus(
                    new Decimal(this.selectedPool?.current_price || 0).times(
                      0.5
                    )
                  )
                )
                .toFixed(18);
      }
    }

    if (this.selectedPool?.left_alt) {
      this.validateInput(this.selectedPool?.left_token || '');
    }
    if (this.selectedPool?.right_alt) {
      this.validateInput(this.selectedPool?.right_token || '');
    }
    console.log(this.inputErrors);
  }

  updateBalance(resourceAddress: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (this.selectedPool) {
      if (resourceAddress === this.selectedPool.left_token) {
        this.xAmount = value;
      } else if (resourceAddress === this.selectedPool.right_token) {
        this.yAmount = value;
      }
    }
    this.validateInput(resourceAddress);
  }

  validateInput(resourceAddress: string) {
    if (!this.selectedPool) return;

    const value =
      resourceAddress === this.selectedPool.left_token
        ? this.xAmount
        : this.yAmount;
    const maxAmount = this.maxAmounts[resourceAddress];

    if (parseFloat(value) > parseFloat(maxAmount)) {
      this.inputErrors[resourceAddress] =
        `Amount exceeds balance of ${maxAmount}`;
    } else {
      delete this.inputErrors[resourceAddress];
    }
  }

  hasInputErrors(): boolean {
    return Object.keys(this.inputErrors).length > 0;
  }

  deposit() {
    if (
      this.hasInputErrors() ||
      (this.selectedPool?.left_alt && !this.xAmount) ||
      (this.selectedPool?.right_alt && !this.yAmount) ||
      !this.selectedPool
    ) {
      return;
    }

    const selectedPool = this.selectedPool;

    const bounds =
      selectedPool?.sub_type === 'precision'
        ? this.ociswapService.calculateTickBounds(
            selectedPool.current_price,
            this.minValue,
            this.maxValue,
            60
          )
        : null;

    if (selectedPool) {
      this.transactionResult = this.radixConnectService
        .getSelectedAccount()
        ?.pipe(
          map(data => {
            if (!data) {
              throw TransactionStatus.Rejected;
            }
            return data;
          }),
          switchMap(async data => {
            const manifest =
              selectedPool.type === 'ociswap'
                ? this.radixManifestService.createOciswapAddLiquidityManifest({
                    account: data.address,
                    poolAddress: selectedPool.component,
                    xAddress: selectedPool.left_token,
                    yAddress: selectedPool.right_token,
                    xAmount: new Decimal(this.xAmount).toFixed(18),
                    yAmount: new Decimal(this.yAmount).toFixed(18),
                    leftBound: bounds?.lowerTick.toString(),
                    rightBound: bounds?.upperTick.toString(),
                  })
                : selectedPool.sub_type === 'single'
                  ? this.radixManifestService.createDefiplazaSingleAddLiquidityManifest(
                      {
                        account: data.address,
                        poolAddress: selectedPool.component,
                        address: selectedPool.left_alt
                          ? selectedPool.left_token
                          : selectedPool.right_token,
                        amount: this.xAmount
                          ? new Decimal(this.xAmount).toFixed(18)
                          : new Decimal(this.yAmount).toFixed(18),
                      }
                    )
                  : this.radixManifestService.createDefiplazaAddLiquidityManifest(
                      {
                        account: data.address,
                        poolAddress: selectedPool.component,
                        xAddress: selectedPool.left_token,
                        yAddress: selectedPool.right_token,
                        xAmount: new Decimal(this.xAmount).toFixed(18),
                        yAmount: new Decimal(this.yAmount).toFixed(18),
                      }
                    );

            console.log(manifest);
            return this.radixConnectService
              .sendTransaction(manifest)
              ?.map(f => f.status)
              .mapErr(() => TransactionStatus.Rejected);
          }),
          map(tx => {
            if (tx?.isOk()) {
              return tx.value;
            } else {
              return TransactionStatus.Rejected;
            }
          }),
          tap(tx => {
            if (tx === TransactionStatus.CommittedSuccess) {
              this.transactionResult = of(undefined);
              this.closeModal();
            }
          })
        );
    }
  }

  updateXAmount(xAmount: string, ratio: string | null | undefined) {
    this.xAmount = xAmount || '0';

    if (this.selectedPool?.sub_type !== 'single') {
      this.yAmount =
        this.selectedPool?.type === 'defiplaza'
          ? new Decimal(this.xAmount).mul(ratio || 0).toFixed(18)
          : new Decimal(this.xAmount)
              .mul(this.selectedPool?.current_price || 0)
              .toString();
    }

    if (this.selectedPool?.left_alt) {
      this.validateInput(this.selectedPool?.left_token || '');
    }

    if (this.selectedPool?.right_alt) {
      this.validateInput(this.selectedPool?.right_token || '');
    }
  }

  updateYAmount(yAmount: string, ratio: string | null | undefined) {
    this.yAmount = yAmount || '0';

    if (this.selectedPool?.sub_type !== 'single') {
      this.xAmount =
        this.selectedPool?.type === 'defiplaza'
          ? new Decimal(this.yAmount).mul(ratio || 0).toFixed(18)
          : new Decimal(this.yAmount)
              .div(
                new Decimal(this.selectedPool?.current_price || 0).plus(
                  new Decimal(this.selectedPool?.current_price || 0).times(0.5)
                )
              )
              .toString();
    }

    if (this.selectedPool?.left_alt) {
      this.validateInput(this.selectedPool?.left_token || '');
    }

    if (this.selectedPool?.right_alt) {
      this.validateInput(this.selectedPool?.right_token || '');
    }
  }
}
