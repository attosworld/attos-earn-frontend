import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
  inject,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { PoolItemComponent } from '../pool-item/pool-item.component';
import { PoolService, Pool } from '../pool.service';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import {
  map,
  finalize,
  debounceTime,
  switchMap,
  tap,
  catchError,
  share,
  takeUntil,
  startWith,
} from 'rxjs/operators';
import Fuse from 'fuse.js';
import { PrecisionPoolComponent } from '../precision-pool/precision-pool.component';
import { Decimal } from 'decimal.js';
import { Balances, RadixConnectService } from '../radix-connect.service';
import { AddLiquidityPreview, OciswapService } from '../ociswap.service';
import { RadixManifestService } from '../radix-manifest.service';
import { TransactionStatus } from '@radixdlt/radix-dapp-toolkit';
import { TokenInputComponent } from '../token-input/token-input.component';
import { PoolDetailsComponent } from '../pool-details/pool-details.component';
import { PortfolioItem, PortfolioService } from '../portfolio.service';
import { PoolIconPairComponent } from '../pool-icon-pair/pool-icon-pair.component';
import { VolumeChartComponent } from '../volume-chart/volume-chart.component';
import { ShortenAddressPipe } from '../shorten-address.pipe';
import {
  ChartToggleComponent,
  ChartType,
} from '../chart-toggle/chart-toggle.component';
import { LpPerformanceChartComponent } from '../lp-performance-chart/lp-performance-chart.component';
import { YieldListComponent } from '../yield-list/yield-list.component';

type SortColumn = 'tvl' | 'bonus_7d' | 'volume_7d' | 'bonus_name' | null;
type SortDirection = 'asc' | 'desc' | 'none';
type PoolType = 'all' | 'double' | 'single' | 'boosted' | 'my_pools';

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

export type TagFilters = Record<string, boolean>;

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
    PoolIconPairComponent,
    ShortenAddressPipe,
    VolumeChartComponent,
    LpPerformanceChartComponent,
    ChartToggleComponent,
  ],
  providers: [PoolService],
  templateUrl: './pool-list.component.html',
  styleUrls: ['./pool-list.component.css'],
})
export class PoolListComponent implements AfterViewInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  @ViewChild('dummyItem') dummyItem!: ElementRef;

  poolModalSelectedView: 'details' | 'news' = 'details';

  lpPerformanceEnabled = false;

  sevenDayVolume$: Observable<Record<string, number>> | undefined;

  cdRef = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  showAdvancedSearch = false;

  showPortfolioModal = false;

  tagFilters: TagFilters = {
    'bridged token': false,
    stablecoin: false,
    dex: false,
    defi: false,
    dao: false,
    meme: false,
    lending: false,
    gamefi: false,
  };

  poolTypeFilters: Record<string, boolean> = {
    double: false,
    single: false,
    precision: false,
    flex: false,
    basic: false,
  };

  closingItems: Record<string, boolean> = {};
  portfolioPools: Observable<
    (Pool & {
      volume_chart: Observable<Record<string, number>>;
    })[]
  > = of([]);

  private sortSubject = new BehaviorSubject<SortEvent>({
    column: null,
    direction: 'none',
  });
  sort$ = this.sortSubject.asObservable().pipe(
    takeUntil(this.destroy$),
    tap(() => console.log('Sort updated'))
  );

  isLoading = true;
  isPortfolioLoading = true;

  private selectedTabSubject = new BehaviorSubject<PoolType>('all');
  selectedTab$ = this.selectedTabSubject
    .asObservable()
    .pipe(tap(() => console.log('tab updated')));

  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable().pipe(
    debounceTime(300),
    takeUntil(this.destroy$),
    tap(() => console.log('search updated'))
  );

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

  filters$ = this.filtersSubject.asObservable().pipe(
    takeUntil(this.destroy$),
    tap(() => console.log('Filters updated'))
  );

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
    share()
  );

  featuredPools$ = this.pools$.pipe(
    map(pools => {
      // Create a copy of the pools array to avoid modifying the original
      const poolsCopy = [...pools];

      // Sort by TVL (descending) for deepest liquidity
      const deepestLiquidity = [...poolsCopy]
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 3);

      // Sort by 7-day volume (descending) for highest volume
      const highestVolume = [...poolsCopy]
        .sort((a, b) => b.volume_7d - a.volume_7d)
        .slice(0, 3);

      // Sort by bonus rate (descending) for best bonus rates
      // Only include pools that are marked as boosted
      const bestBonus = [...poolsCopy]
        .filter(pool => pool.boosted)
        .sort((a, b) => b.bonus_7d - a.bonus_7d)
        .slice(0, 3);

      return {
        deepestLiquidity,
        highestVolume,
        bestBonus,
      };
    }),
    share()
  );

  portfolioItems$ = (this.radixConnectService.getAccounts() || of([])).pipe(
    switchMap(accounts => {
      if (!accounts || !accounts.length) {
        return of(undefined).pipe(
          finalize(() => (this.isPortfolioLoading = false)),
          share()
        );
      }

      return combineLatest(
        accounts.map(account =>
          this.portfolioService.getPortfolioItems(account.address)
        )
      ).pipe(
        map(itemArrays => itemArrays.flat()),
        finalize(() => (this.isPortfolioLoading = false)),
        tap(portfolioItems => {
          this.portfolioPools = this.pools$.pipe(
            map(pools =>
              pools
                .filter(pool =>
                  portfolioItems.some(
                    item =>
                      item.component === pool.component &&
                      pool.sub_type !== 'single'
                  )
                )
                .map(
                  pool =>
                    ({
                      ...pool,
                      volume_chart: this.poolService
                        .getPoolVolumePerDay(pool.component, pool.type)
                        .pipe(map(volumeData => volumeData.volume_per_day)),
                    }) as Pool & {
                      volume_chart: Observable<Record<string, number>>;
                    }
                )
            ),
            tap(pi => console.log(pi))
          );
        })
      );
    }),
    share()
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
    share()
  );

  portfolioService = inject(PortfolioService);

  // portfolioItems$: Observable<PortfolioItem[]> = of([
  //   {
  //     poolName: 'EARLY/DFP2',
  //     leftAlt: 'EARLY',
  //     rightAlt: 'DFP2',
  //     leftIcon:
  //       'https://arweave.net/uXCQ9YVGkEijn7PS2wdkXqwkU_YrdgpNtQPH2Y1-Qcs',
  //     rightIcon:
  //       'https://radix.defiplaza.net/assets/img/babylon/defiplaza-icon.png',
  //     provider: 'Defiplaza',
  //     invested: '127.4211858192467183',
  //     currentValue: '129.94913788710330066',
  //     investedXrd: '20190.430593910679881',
  //     currentValueXrd: '20590.995385727911186',
  //     pnl: '2.52795206785658236',
  //     pnlPercentage: '1.98393387379286199990',
  //     closeManifest:
  //       'CALL_METHOD\n  Address("account_rdx12962a8y6penj8wudzyddp07r6l4uccvaxyet2pqptkx96ylk5n770v")\n  "withdraw"\n  Address("resource_rdx1tkc7hdmwhgza24nes4z0yf2ljc2fedvg2h7el2fzdxfgw0f2wq7pwz")\n  Decimal("723.493677887522574816")\n;\nTAKE_ALL_FROM_WORKTOP\n  Address("resource_rdx1tkc7hdmwhgza24nes4z0yf2ljc2fedvg2h7el2fzdxfgw0f2wq7pwz")\n  Bucket("surge_lp")\n;\nCALL_METHOD\n  Address("component_rdx1cpr3gvk0r3nauc24kt0y0w5cpvjcxe54z07nu26z83qk2tgeangmdl")\n  "remove_liquidity"\n  Bucket("surge_lp")\n  true\n;\nCALL_METHOD\n  Address("account_rdx12962a8y6penj8wudzyddp07r6l4uccvaxyet2pqptkx96ylk5n770v")\n  "deposit_batch"\n  Expression("ENTIRE_WORKTOP")\n;',
  //   },
  //   {
  //     poolName: 'ILIS/DFP2',
  //     leftAlt: 'ILIS',
  //     rightAlt: 'DFP2',
  //     leftIcon: 'https://ilikeitstable.com/images/lplogo.png',
  //     rightIcon:
  //       'https://radix.defiplaza.net/assets/img/babylon/defiplaza-icon.png',
  //     provider: 'Defiplaza',
  //     invested: '265.60041043504271809',
  //     currentValue: '265.19629200026255863',
  //     investedXrd: '42085.518339234540139',
  //     currentValueXrd: '42021.484048887226644',
  //     pnl: '-0.40411843478015946',
  //     pnlPercentage: '-0.15215279001949952813',
  //     closeManifest:
  //       'CALL_METHOD\n  Address("account_rdx12962a8y6penj8wudzyddp07r6l4uccvaxyet2pqptkx96ylk5n770v")\n  "withdraw"\n  Address("resource_rdx1t4z3dn6u57kj069wru4tkmdrx8njz2d9a5rlfsphs87cyuaj9tufv0")\n  Decimal("2361.061214041296133865")\n;\nTAKE_ALL_FROM_WORKTOP\n  Address("resource_rdx1t4z3dn6u57kj069wru4tkmdrx8njz2d9a5rlfsphs87cyuaj9tufv0")\n  Bucket("surge_lp")\n;\nCALL_METHOD\n  Address("component_rdx1cz9akawaf6d2qefds33c5py9w3fjpgp2qnaddtlcxm06m060wl2j68")\n  "remove_liquidity"\n  Bucket("surge_lp")\n  false\n;\nCALL_METHOD\n  Address("account_rdx12962a8y6penj8wudzyddp07r6l4uccvaxyet2pqptkx96ylk5n770v")\n  "deposit_batch"\n  Expression("ENTIRE_WORKTOP")\n;',
  //   },
  // ] as PortfolioItem[]);

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$.unsubscribe();
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

      if (sort.column === 'bonus_name') {
        // Handle string comparison for bonus_name
        const aValue = (a[sort.column] || '').toLowerCase();
        const bValue = (b[sort.column] || '').toLowerCase();
        if (sort.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        // Handle numeric comparison for other columns
        if (sort.direction === 'asc') {
          return a[sort.column] - b[sort.column];
        } else {
          return b[sort.column] - a[sort.column];
        }
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

    if (this.isMobile) {
      this.showAdvancedSearch = false;
    } else {
      this.showAdvancedSearch = true;
    }
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
      const matchesTags = this.applyTagFilters(pool);
      const matchesPoolTypes = this.applyPoolTypeFilters(pool);
      return (
        tvlMatch && bonusMatch && volumeMatch && matchesTags && matchesPoolTypes
      );
    });
  }

  private applyNumericFilter(value: number, filter: Filter): boolean {
    if (filter.value === null) return true;
    return filter.condition === 'above'
      ? value >= filter.value
      : value <= filter.value;
  }

  private applyTagFilters(pool: Pool): boolean {
    const selectedTags = Object.keys(this.tagFilters).filter(
      tag => this.tagFilters[tag as keyof TagFilters]
    );
    return (
      selectedTags.length === 0 ||
      selectedTags.some(tag => pool.tags?.includes(tag))
    );
  }

  private applyPoolTypeFilters(pool: Pool): boolean {
    const selectedTypes = Object.keys(this.poolTypeFilters).filter(
      type => this.poolTypeFilters[type]
    );
    return selectedTypes.length === 0 || selectedTypes.includes(pool.sub_type);
  }

  applyFilters(): void {
    this.filtersSubject.next({
      tvl: this.tvlFilter,
      bonus: this.bonusFilter,
      volume: this.volumeFilter,
    });
  }

  toggleTag(tag: string) {
    this.tagFilters[tag] = !this.tagFilters[tag];
    this.applyFilters();
  }

  togglePoolType(poolType: string) {
    this.poolTypeFilters[poolType] = !this.poolTypeFilters[poolType];
    this.applyFilters();
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

  selectedChartType: ChartType = 'volume';
  tokenValueData$: Observable<Record<string, number>> | undefined;

  balances$: Observable<Balances | undefined> = this.radixConnectService
    .getWalletData()
    .pipe(
      startWith({
        account: '',
        fungibles: [],
        nonFungibles: [],
      } as Balances)
    );

  openDepositModal(pool: Pool, balances: Balances | undefined) {
    this.selectedPool = pool;
    this.showModal = true;
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
    this.updateMaxAmounts(balances);
    this.selectedChartType = 'volume'; // Default to volume chart

    // Fetch the seven-day volume data
    this.sevenDayVolume$ = this.poolService
      .getPoolVolumePerDay(pool.component, pool.type)
      .pipe(map(volumeData => volumeData.volume_per_day));

    // Fetch the token value data for LP performance chart
    this.tokenValueData$ = this.poolService.getPoolPerformance(
      pool.left_token,
      pool.side
    );
  }

  closeModal() {
    this.showModal = false;
    this.selectedPool = null;
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
  }

  updateMaxAmounts(walletData: Balances | undefined) {
    if (this.selectedPool) {
      if (walletData && this.selectedPool) {
        this.maxAmounts[this.selectedPool.left_token] =
          walletData.fungibles.find(
            f =>
              f.resourceInfo.resourceAddress === this.selectedPool?.left_token
          )?.balance || '0';
        this.maxAmounts[this.selectedPool.right_token] =
          walletData.fungibles.find(
            f =>
              f.resourceInfo.resourceAddress === this.selectedPool?.right_token
          )?.balance || '0';
      }
    }
  }

  setMaxBalance(resourceAddress: string) {
    const maxAmount = this.maxAmounts[resourceAddress];
    if (this.selectedPool) {
      if (resourceAddress === this.selectedPool.left_token) {
        this.xAmount = maxAmount;
        this.yAmount =
          this.selectedPool?.type === 'defiplaza'
            ? new Decimal(this.xAmount)
                .mul(this.selectedPool.xRatio || 0)
                .toFixed(18)
            : new Decimal(this.xAmount)
                .mul(this.selectedPool?.current_price || 0)
                .toFixed(18);
      } else if (resourceAddress === this.selectedPool.right_token) {
        this.yAmount = maxAmount;
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
                        amount: selectedPool.left_alt
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

  private userHasPosition(
    pool: Pool,
    portfolioItems: PortfolioItem[]
  ): boolean {
    // Implement this method to check if the user has a position in the given pool
    // You can use the portfolioItems$ observable to check this
    if (portfolioItems.some(item => item.component === pool.component)) {
      console.log(portfolioItems.some(item => item.component === pool.name));
    }
    return portfolioItems.some(item => item.component === pool.component);
    // return portfolioItems.some(item => item.poolName === pool.name);
  }

  getPoolVolume(pool: Pool): Observable<Record<string, number>> {
    return this.poolService
      .getPoolVolumePerDay(pool.component, pool.type)
      .pipe(map(volumeData => volumeData.volume_per_day));
  }

  onChartTypeChange(chartType: ChartType): void {
    // Update the selected chart type for this specific pool
    this.selectedChartType = chartType;
  }

  toggleAdvancedSearch() {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  togglePortfolioModal(): void {
    this.showPortfolioModal = !this.showPortfolioModal;

    // Prevent body scrolling when modal is open
    if (this.showPortfolioModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }

  togglePoolModalDetails(tab: 'details' | 'news') {
    this.poolModalSelectedView = tab;
  }
}
