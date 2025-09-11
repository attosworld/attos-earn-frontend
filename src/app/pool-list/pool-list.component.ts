import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  ChangeDetectorRef,
  OnDestroy,
  AfterContentChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ScrollingModule,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { PoolItemComponent } from '../pool-item/pool-item.component';
import { PoolService, Pool, PoolLiquidity } from '../pool.service';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  of,
  Subject,
  Subscription,
} from 'rxjs';
import {
  map,
  finalize,
  debounceTime,
  switchMap,
  tap,
  catchError,
  share,
  takeUntil,
  distinctUntilChanged,
  filter,
  startWith,
} from 'rxjs/operators';
import Fuse from 'fuse.js';
import { PrecisionPoolComponent } from '../precision-pool/precision-pool.component';
import { Decimal } from 'decimal.js';
import { Balances, RadixConnectService } from '../radix-connect.service';
import { OciswapService } from '../ociswap.service';
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
import { NewsService, TokenNews } from '../news.service';
import { LiquidityChartComponent } from '../liquidity-chart/liquidity-chart.component';
import { ActivatedRoute, Router } from '@angular/router';
import { DefiplazaService } from '../defiplaza.service';
import { AttosService } from '../attos.service';

type SortColumn = 'tvl' | 'bonus_7d' | 'volume_7d' | 'bonus_name' | null;
type SortDirection = 'asc' | 'desc' | 'none';
type PoolType =
  | 'all'
  | 'double'
  | 'single'
  | 'boosted'
  | 'my_pools'
  | 'owned_tokens';

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
    LiquidityChartComponent,
    ChartToggleComponent,
  ],
  providers: [PoolService],
  templateUrl: './pool-list.component.html',
  styleUrls: ['./pool-list.component.css'],
})
export class PoolListComponent implements OnDestroy, AfterContentChecked {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  @ViewChild('dummyItem') dummyItem!: ElementRef;

  private router = inject(Router);

  private route = inject(ActivatedRoute);

  poolModalSelectedView: 'details' | 'news' = 'details';

  attosService = inject(AttosService);

  stats$ = this.attosService.getStats();

  lpPerformanceEnabled = true;

  sevenDayVolume$: Observable<Record<string, number>> | undefined;

  cdRef = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  showAdvancedSearch = false;

  showPortfolioModal = false;

  newsService = inject(NewsService);

  tagFilters: TagFilters = {
    wrapped: false,
    stablecoin: false,
    dex: false,
    defi: false,
    dao: false,
    meme: false,
    lending: false,
    gamefi: false,
    incentives: false,
  };

  poolTypeFilters: Record<string, boolean> = {
    double: false,
    single: false,
    precision: false,
    flex: false,
    basic: false,
  };

  poolTypeProvider: Record<string, boolean> = {
    defiplaza: true,
    ociswap: true,
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
  sort$ = this.sortSubject.asObservable().pipe(takeUntil(this.destroy$));

  isLoading = true;
  isPortfolioLoading = true;

  private selectedTabSubject = new BehaviorSubject<PoolType>('all');

  selectedTab$ = this.selectedTabSubject.asObservable();

  news: Observable<TokenNews[] | null> = of(null);

  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject
    .asObservable()
    .pipe(debounceTime(300), takeUntil(this.destroy$));

  showBonusInfo = false;

  itemSize = 60; // Estimated height of each pool item
  itemSizeUpdated = false;

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

  filters$ = this.filtersSubject.asObservable().pipe(takeUntil(this.destroy$));

  private precisionPriceSubject = new BehaviorSubject<string>('');

  poolPrice$ = this.precisionPriceSubject.asObservable().pipe(
    switchMap(component => {
      if (!component) return of(null);

      return this.ociswapService.getPrecisionPrice(component);
    })
  );

  private selectedPoolSubject = new BehaviorSubject<Pool | null>(null);

  selectedPool$ = this.selectedPoolSubject.asObservable();

  showModal = false;

  private inputChangeSubject = new Subject<void>();

  addLiquidityPreview$ = combineLatest([
    this.selectedPool$.pipe(
      filter(pool => pool !== null),
      distinctUntilChanged((prev, curr) => prev?.component === curr?.component)
    ),
    this.inputChangeSubject.pipe(
      debounceTime(300), // 300ms debounce
      startWith(undefined) // Initial emission
    ),
    this.poolPrice$,
  ]).pipe(
    switchMap(([pool, , poolPrice]) => {
      if (!pool) return of(null);

      if (pool.sub_type === 'precision' && poolPrice) {
        const { lowerTick, upperTick } =
          this.ociswapService.calculateTickBounds(
            poolPrice.precisionPrice,
            this.minValue,
            this.maxValue
          );

        return this.ociswapService
          .getOciswapAddLiquidityPreview(
            pool.component,
            this.xAmount,
            '',
            lowerTick.toString(),
            upperTick.toString()
          )
          .pipe(
            tap(data => {
              if (data && data.x_amount && data.y_amount) {
                this.xAmount = new Decimal(data.x_amount.token)
                  .toDecimalPlaces(pool.xDivisibility)
                  .toString();
                this.yAmount = new Decimal(data.y_amount.token)
                  .toDecimalPlaces(pool.yDivisibility)
                  .toString();
              }
            }),
            catchError(() => {
              this.inputErrors[pool?.right_token || ''] =
                'An error occurred while fetching add liquidity preview.';
              return of(null);
            })
          );
      } else if (pool.type === 'ociswap') {
        return this.ociswapService
          .getOciswapAddLiquidityPreview(pool.component, this.xAmount, '')
          .pipe(
            tap(data => {
              if (data && data.x_amount && data.y_amount) {
                this.xAmount = data.x_amount.token;
                this.yAmount = data.y_amount.token;
              }
            }),
            catchError(() => {
              this.inputErrors[pool?.right_token || ''] =
                'An error occurred while fetching add liquidity preview.';
              return of(null);
            })
          );
      } else if (pool.type === 'defiplaza') {
        return this.defiplazaService.getPoolDetails(pool.component).pipe(
          tap(res => {
            pool.xRatio = res.baseRatio.toFixed(18);
            pool.yRatio = res.quoteRatio.toFixed(18);
            pool.xDivisibility = res.baseDivisibility;
            pool.yDivisibility = res.quoteDivisibility;
          })
        );
      }
      return of(null);
    })
  );

  minValue = -90;
  maxValue = 900;

  ociswapService = inject(OciswapService);

  radixManifestService = inject(RadixManifestService);

  poolService = inject(PoolService);

  radixConnectService = inject(RadixConnectService);

  txButtonStatus = this.radixConnectService.getButtonStatus();

  transactionResult?: Observable<TransactionStatus | undefined> = of(undefined);

  pools$ = this.poolService.getPools().pipe(
    finalize(() => {
      this.isLoading = false;
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
          this.portfolioService.getPortfolioItems(account.address, 'lp')
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
            )
          );
        })
      );
    }),
    share()
  );

  balances$: Observable<Balances | undefined> = this.radixConnectService
    .getWalletData()
    .pipe(
      startWith({
        account: '',
        fungibles: [],
        nonFungibles: [],
      } as Balances)
    );

  sortedPools$ = combineLatest([
    this.pools$,
    this.sort$,
    this.search$,
    this.selectedTab$,
    this.filters$,
    this.balances$,
  ]).pipe(
    map(([pools, sort, searchTerm, selectedTab, filters, balances]) => {
      let filteredPools = this.filterPoolsByType(pools, selectedTab, balances);
      filteredPools = this.searchPools(filteredPools, searchTerm);
      filteredPools = this.applyAdvancedFilters(filteredPools, filters);
      return this.sortBasedOnEvent(filteredPools, sort);
    }),
    share()
  );

  portfolioService = inject(PortfolioService);

  selectedChartType: ChartType = 'volume';
  tokenValueData$: Observable<Record<string, number>> | undefined;

  XRD = 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';
  DFP2 = 'resource_rdx1t5ywq4c6nd2lxkemkv4uzt8v7x7smjcguzq5sgafwtasa6luq7fclq';

  liquidityValueData$: Observable<PoolLiquidity> | undefined;
  liquidityEnabled = false;
  previewData!: { highPrice: number; lowPrice: number };
  urlSync!: Subscription;
  showMobileFilters!: boolean;

  defiplazaService = inject(DefiplazaService);

  constructor() {
    this.initializeFromUrl();
    this.setupUrlSync();
  }

  openDepositModal(pool: Pool, balances: Balances | undefined) {
    this.defiplazaService.getPoolDetails(pool.component);
    if (pool.sub_type === 'precision') {
      this.precisionPriceSubject.next(pool.component);
    }
    this.selectedPoolSubject.next(pool);
    this.showModal = true;
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
    this.updateMaxAmounts(balances);
    this.selectedChartType = 'volume'; // Default to volume chart
    this.poolModalSelectedView = 'details';
    this.liquidityEnabled = pool.sub_type === 'precision';

    // Fetch the seven-day volume data
    this.sevenDayVolume$ = this.poolService
      .getPoolVolumePerDay(pool.component, pool.type)
      .pipe(map(volumeData => volumeData.volume_per_day));

    const tokenForNews =
      pool.left_token === this.XRD && pool.type === 'ociswap'
        ? pool.right_token
        : pool.left_token;

    this.news = this.newsService.getNews(tokenForNews);

    // Fetch the token value data for LP performance chart
    this.tokenValueData$ = this.poolService.getPoolPerformance(
      tokenForNews,
      pool.side || pool.type,
      pool.component
    );

    this.liquidityValueData$ = this.poolService.getPoolLiquidity(
      pool.component
    );
  }

  closeModal() {
    this.showModal = false;
    this.selectedPoolSubject.next(null);
    this.xAmount = '';
    this.yAmount = '';
    this.inputErrors = {};
  }

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

  private filterPoolsByType(
    pools: Pool[],
    selectedTab: PoolType,
    balances: Balances | undefined
  ): Pool[] {
    switch (selectedTab) {
      case 'all':
        return pools;
      case 'boosted':
        return pools.filter(pool => pool.boosted);
      case 'owned_tokens':
        return pools.filter(pool =>
          balances?.fungibles.some(
            fungible =>
              (fungible.resourceInfo.resourceAddress === pool.left_token ||
                fungible.resourceInfo.resourceAddress === pool.right_token) &&
              fungible.resourceInfo.resourceAddress != this.XRD &&
              fungible.resourceInfo.resourceAddress != this.DFP2 &&
              +fungible.balance > 0
          )
        );
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

  ngAfterContentChecked() {
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
    if (this.dummyItem && !this.itemSizeUpdated) {
      this.itemSize = this.dummyItem.nativeElement.offsetHeight;
      if (this.viewport) {
        this.viewport.checkViewportSize();
      }
      this.itemSizeUpdated = true;
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
      const matchesPoolProvider = this.applyPoolProviderFilters(pool);
      return (
        tvlMatch &&
        bonusMatch &&
        volumeMatch &&
        matchesTags &&
        matchesPoolTypes &&
        matchesPoolProvider
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
      selectedTags.some(tag =>
        tag === 'gamefi'
          ? pool.tags?.includes(tag) || pool.tags?.includes('game')
          : pool.tags?.includes(tag)
      )
    );
  }

  private applyPoolTypeFilters(pool: Pool): boolean {
    const selectedTypes = Object.keys(this.poolTypeFilters).filter(
      type => this.poolTypeFilters[type]
    );
    return selectedTypes.length === 0 || selectedTypes.includes(pool.sub_type);
  }

  private applyPoolProviderFilters(pool: Pool): boolean {
    const selectedTypes = Object.keys(this.poolTypeProvider).filter(
      type => this.poolTypeProvider[type]
    );
    return selectedTypes.length === 0 || selectedTypes.includes(pool.type);
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

  togglePoolProvider(poolType: string) {
    this.poolTypeProvider[poolType] = !this.poolTypeProvider[poolType];
    this.applyFilters();
  }

  updateMinValue(minValue: number, poolSubType?: string) {
    this.minValue = minValue;

    this.updateAmount();

    if (poolSubType) {
      this.updateDepositModalTab();
    }
  }

  updateMaxValue(maxValue: number, poolSubType?: string) {
    this.maxValue = maxValue;

    this.updateAmount();

    if (poolSubType) {
      this.updateDepositModalTab();
    }
  }

  private updateDepositModalTab() {
    if (this.selectedChartType !== 'liquidity') {
      this.selectedChartType = 'liquidity';
    }
  }

  private updateAmount() {
    this.inputChangeSubject.next();
  }

  updateMaxAmounts(walletData: Balances | undefined) {
    const selectedPool = this.selectedPoolSubject.getValue();

    if (selectedPool) {
      if (walletData) {
        this.maxAmounts[selectedPool.left_token] =
          walletData.fungibles.find(
            f => f.resourceInfo.resourceAddress === selectedPool.left_token
          )?.balance || '0';
        this.maxAmounts[selectedPool.right_token] =
          walletData.fungibles.find(
            f => f.resourceInfo.resourceAddress === selectedPool.right_token
          )?.balance || '0';
      }
    }
  }

  setMaxBalance(resourceAddress: string) {
    const maxAmount = this.maxAmounts[resourceAddress];
    const selectedPool = this.selectedPoolSubject.getValue();
    if (selectedPool) {
      if (resourceAddress === selectedPool.left_token) {
        this.xAmount = maxAmount;

        if (
          selectedPool?.type === 'defiplaza' ||
          selectedPool.sub_type !== 'precision'
        ) {
          this.yAmount =
            selectedPool?.type === 'defiplaza'
              ? new Decimal(this.xAmount)
                  .mul(selectedPool.xRatio || 0)
                  .toDecimalPlaces(selectedPool.yDivisibility)
                  .toString()
              : new Decimal(this.xAmount)
                  .mul(selectedPool?.current_price || 0)
                  .toDecimalPlaces(selectedPool.yDivisibility)
                  .toString();
        }
      } else if (resourceAddress === selectedPool.right_token) {
        this.yAmount = maxAmount;

        if (
          selectedPool.type === 'defiplaza' ||
          selectedPool.sub_type !== 'precision'
        ) {
          this.xAmount =
            selectedPool?.type === 'defiplaza'
              ? new Decimal(this.yAmount)
                  .mul(selectedPool.yRatio || 0)
                  .toDecimalPlaces(selectedPool.xDivisibility)
                  .toString()
              : new Decimal(this.yAmount)
                  .div(
                    new Decimal(selectedPool?.current_price || 0).plus(
                      new Decimal(selectedPool?.current_price || 0).times(0.5)
                    )
                  )
                  .toDecimalPlaces(selectedPool.xDivisibility)
                  .toString();
        }
      }
      if (selectedPool?.type === 'ociswap') {
        this.updateAmount();
      }
    }

    if (selectedPool?.left_alt) {
      this.validateInput(selectedPool?.left_token || '');
    }
    if (selectedPool?.right_alt) {
      this.validateInput(selectedPool?.right_token || '');
    }
  }

  updateBalance(resourceAddress: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    const selectedPool = this.selectedPoolSubject.getValue();
    if (selectedPool) {
      if (resourceAddress === selectedPool.left_token) {
        this.xAmount = value;
      } else if (resourceAddress === selectedPool.right_token) {
        this.yAmount = value;
      }
    }
    this.validateInput(resourceAddress);
  }

  validateInput(resourceAddress: string) {
    const selectedPool = this.selectedPoolSubject.getValue();
    if (!selectedPool) return;

    const value =
      resourceAddress === selectedPool.left_token ? this.xAmount : this.yAmount;
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

  deposit(precisionPrice?: number) {
    if (
      this.hasInputErrors() ||
      (this.selectedPoolSubject.getValue()?.left_alt && !this.xAmount) ||
      (this.selectedPoolSubject.getValue()?.right_alt && !this.yAmount) ||
      !this.selectedPoolSubject.getValue()
    ) {
      return;
    }

    const selectedPool = this.selectedPoolSubject.getValue();

    const bounds =
      selectedPool?.sub_type === 'precision' && precisionPrice
        ? this.ociswapService.calculateTickBounds(
            precisionPrice,
            this.minValue,
            this.maxValue
          )
        : null;

    if (selectedPool) {
      this.transactionResult = this.radixConnectService
        .getRawSelectedAccount()
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
                    xAmount: new Decimal(this.xAmount)
                      .toDecimalPlaces(selectedPool.xDivisibility)
                      .toString(),
                    yAmount: new Decimal(this.yAmount)
                      .toDecimalPlaces(selectedPool.yDivisibility)
                      .toString(),
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
                          ? new Decimal(this.xAmount)
                              .toDecimalPlaces(selectedPool.xDivisibility)
                              .toString()
                          : new Decimal(this.yAmount)
                              .toDecimalPlaces(selectedPool.yDivisibility)
                              .toString(),
                      }
                    )
                  : this.radixManifestService.createDefiplazaAddLiquidityManifest(
                      {
                        account: data.address,
                        poolAddress: selectedPool.component,
                        xAddress:
                          selectedPool.side === 'quote'
                            ? selectedPool.left_token
                            : selectedPool.right_token,
                        yAddress:
                          selectedPool.side === 'quote'
                            ? selectedPool.right_token
                            : selectedPool.left_token,
                        xAmount:
                          selectedPool.side === 'quote'
                            ? new Decimal(this.xAmount)
                                .toDecimalPlaces(selectedPool.xDivisibility)
                                .toString()
                            : new Decimal(this.yAmount)
                                .toDecimalPlaces(selectedPool.yDivisibility)
                                .toString(),
                        yAmount:
                          selectedPool.side === 'quote'
                            ? new Decimal(this.yAmount)
                                .toDecimalPlaces(selectedPool.yDivisibility)
                                .toString()
                            : new Decimal(this.xAmount)
                                .toDecimalPlaces(selectedPool.xDivisibility)
                                .toString(),
                      }
                    );

            return this.radixConnectService
              .sendTransaction(manifest)
              ?.map(f => f.status)
              .map(status => {
                if (status === TransactionStatus.CommittedSuccess) {
                  this.portfolioService.refresh();
                }
                return status;
              })
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

    const selectedPool = this.selectedPoolSubject.getValue();
    if (
      (selectedPool?.sub_type !== 'single' &&
        selectedPool?.type === 'defiplaza') ||
      selectedPool?.sub_type !== 'precision'
    ) {
      this.yAmount =
        selectedPool?.type === 'defiplaza'
          ? selectedPool.side === 'base'
            ? new Decimal(this.xAmount)
                .mul(ratio || 0)
                .toDecimalPlaces(selectedPool.yDivisibility)
                .toString()
            : new Decimal(this.xAmount)
                .mul(ratio || 0)
                .toDecimalPlaces(selectedPool.yDivisibility)
                .toString()
          : new Decimal(this.xAmount)
              .mul(selectedPool?.current_price || 0)
              .toString();
    }

    if (selectedPool?.left_alt) {
      this.validateInput(selectedPool?.left_token || '');
    }

    if (selectedPool?.right_alt) {
      this.validateInput(selectedPool?.right_token || '');
    }

    if (selectedPool?.type === 'ociswap') {
      this.updateAmount();
    }
  }

  updateYAmount(yAmount: string, ratio: string | null | undefined) {
    this.yAmount = yAmount || '0';

    const selectedPool = this.selectedPoolSubject.getValue();
    if (
      (selectedPool?.sub_type !== 'single' &&
        selectedPool?.type == 'defiplaza') ||
      selectedPool?.sub_type !== 'precision'
    ) {
      this.xAmount =
        selectedPool?.type === 'defiplaza'
          ? selectedPool.side === 'base'
            ? new Decimal(this.yAmount)
                .mul(ratio || 0)
                .toDecimalPlaces(selectedPool.xDivisibility)
                .toString()
            : new Decimal(this.yAmount)
                .mul(ratio || 0)
                .toDecimalPlaces(selectedPool.xDivisibility)
                .toString()
          : new Decimal(this.yAmount)
              .div(
                new Decimal(selectedPool?.current_price || 0).plus(
                  new Decimal(selectedPool?.current_price || 0).times(0.5)
                )
              )
              .toString();
    }

    if (selectedPool?.left_alt) {
      this.validateInput(selectedPool?.left_token || '');
    }

    if (selectedPool?.right_alt) {
      this.validateInput(selectedPool?.right_token || '');
    }

    if (selectedPool?.type === 'ociswap') {
      this.updateAmount();
    }
  }

  async closeStrategy(item: PortfolioItem) {
    this.closingItems[item.closeManifest] = true;
    try {
      const response = await this.radixConnectService.sendTransaction(
        item.closeManifest
      );
      if (response?.isOk()) {
        this.transactionResult = of(response.value.status);
        if (response.value.status === TransactionStatus.CommittedSuccess) {
          this.portfolioService.refresh();
        }
      } else {
        this.transactionResult = of(TransactionStatus.Rejected);
      }
    } finally {
      this.closingItems[item.closeManifest] = false;
    }
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

  updatePreviewData(
    {
      currentPrice,
      minValue,
      maxValue,
    }: {
      currentPrice: number;
      minValue: number;
      maxValue: number;
    },
    selectedPool: Pool
  ) {
    const lowPrice = this.ociswapService.adjustPriceByPercentage(
      currentPrice,
      minValue
    );
    const highPrice = this.ociswapService.adjustPriceByPercentage(
      currentPrice,
      maxValue
    );
    this.previewData = {
      lowPrice,
      highPrice,
    };
  }

  private initializeFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    // Initialize search term
    if (params['search']) {
      this.searchTerm = params['search'];
      this.searchSubject.next(this.searchTerm);
    }

    // Initialize selected tab
    if (params['tab'] && this.isValidPoolType(params['tab'])) {
      this.selectedTabSubject.next(params['tab'] as PoolType);
    }

    // Initialize sort
    if (params['sortColumn'] && params['sortDirection']) {
      const column = this.isValidSortColumn(params['sortColumn'])
        ? (params['sortColumn'] as SortColumn)
        : null;
      const direction = this.isValidSortDirection(params['sortDirection'])
        ? (params['sortDirection'] as SortDirection)
        : 'none';
      this.sortSubject.next({ column, direction });
    }

    // Initialize numeric filters
    if (params['tvlCondition'] && params['tvlValue']) {
      this.tvlFilter = {
        condition: params['tvlCondition'] as 'above' | 'below',
        value: parseFloat(params['tvlValue']),
      };
    }

    if (params['bonusCondition'] && params['bonusValue']) {
      this.bonusFilter = {
        condition: params['bonusCondition'] as 'above' | 'below',
        value: parseFloat(params['bonusValue']),
      };
    }

    if (params['volumeCondition'] && params['volumeValue']) {
      this.volumeFilter = {
        condition: params['volumeCondition'] as 'above' | 'below',
        value: parseFloat(params['volumeValue']),
      };
    }

    // Initialize tag filters
    Object.keys(this.tagFilters).forEach(tag => {
      if (params[`tag_${tag.replace(/\s+/g, '_')}`] === 'true') {
        this.tagFilters[tag] = true;
      }
    });

    // Initialize pool type filters
    Object.keys(this.poolTypeFilters).forEach(type => {
      if (params[`poolType_${type}`] === 'true') {
        this.poolTypeFilters[type] = true;
      }
    });

    // Initialize pool provider filters
    Object.keys(this.poolTypeProvider).forEach(provider => {
      if (params[`provider_${provider}`] === 'false') {
        this.poolTypeProvider[provider] = false;
      }
    });

    // Update filters subject with initialized values
    this.filtersSubject.next({
      tvl: this.tvlFilter,
      bonus: this.bonusFilter,
      volume: this.volumeFilter,
    });
  }

  resetFilters() {
    // Reset all filter states
    this.searchTerm = '';
    this.searchSubject.next('');
    this.selectedTabSubject.next('all');
    this.sortSubject.next({ column: null, direction: 'none' });

    this.tvlFilter = { condition: 'above', value: null };
    this.bonusFilter = { condition: 'above', value: null };
    this.volumeFilter = { condition: 'above', value: null };

    Object.keys(this.tagFilters).forEach(tag => {
      this.tagFilters[tag] = false;
    });

    Object.keys(this.poolTypeFilters).forEach(type => {
      this.poolTypeFilters[type] = false;
    });

    Object.keys(this.poolTypeProvider).forEach(provider => {
      this.poolTypeProvider[provider] = true;
    });

    this.filtersSubject.next({
      tvl: this.tvlFilter,
      bonus: this.bonusFilter,
      volume: this.volumeFilter,
    });

    // Clear URL parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  private setupUrlSync(): void {
    // Sync all filter changes to URL
    this.urlSync = combineLatest([
      this.search$,
      this.selectedTab$,
      this.sort$,
      this.filters$,
    ])
      .pipe(
        debounceTime(300), // Debounce to avoid too many URL updates
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateUrl();
      });
  }

  private updateUrl(): void {
    const queryParams: Record<string, string> = {};

    // Add search term
    if (this.searchTerm) {
      queryParams['search'] = this.searchTerm;
    }

    // Add selected tab
    const currentTab = this.selectedTabSubject.value;
    if (currentTab !== 'all') {
      queryParams['tab'] = currentTab;
    }

    // Add sort parameters
    const currentSort = this.sortSubject.value;
    if (currentSort.column && currentSort.direction !== 'none') {
      queryParams['sortColumn'] = currentSort.column;
      queryParams['sortDirection'] = currentSort.direction;
    }

    // Add numeric filters
    if (this.tvlFilter.value !== null) {
      queryParams['tvlCondition'] = this.tvlFilter.condition;
      queryParams['tvlValue'] = `${this.tvlFilter.value}`;
    }

    if (this.bonusFilter.value !== null) {
      queryParams['bonusCondition'] = this.bonusFilter.condition;
      queryParams['bonusValue'] = `${this.bonusFilter.value}`;
    }

    if (this.volumeFilter.value !== null) {
      queryParams['volumeCondition'] = `${this.volumeFilter.condition}`;
      queryParams['volumeValue'] = `${this.volumeFilter.value}`;
    }

    // Add tag filters (only active ones)
    Object.entries(this.tagFilters).forEach(([tag, isActive]) => {
      if (isActive) {
        queryParams[`tag_${tag.replace(/\s+/g, '_')}`] = 'true';
      }
    });

    // Add pool type filters (only active ones)
    Object.entries(this.poolTypeFilters).forEach(([type, isActive]) => {
      if (isActive) {
        queryParams[`poolType_${type}`] = 'true';
      }
    });

    // Add pool provider filters (only inactive ones, since default is true)
    Object.entries(this.poolTypeProvider).forEach(([provider, isActive]) => {
      if (!isActive) {
        queryParams[`provider_${provider}`] = 'false';
      }
    });

    // Update URL without triggering navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace',
      replaceUrl: true,
    });
  }

  private isValidPoolType(type: string): boolean {
    return [
      'all',
      'double',
      'single',
      'boosted',
      'my_pools',
      'owned_tokens',
    ].includes(type);
  }

  private isValidSortColumn(column: string): boolean {
    return ['tvl', 'bonus_7d', 'volume_7d', 'bonus_name'].includes(column);
  }

  private isValidSortDirection(direction: string): boolean {
    return ['asc', 'desc', 'none'].includes(direction);
  }

  // Add these methods to your component class
  toggleMobileFilters() {
    this.showMobileFilters = !this.showMobileFilters;
  }
}
