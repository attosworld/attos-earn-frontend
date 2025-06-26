import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StrategiesService, Strategy } from '../strategies.service';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  map,
  of,
  switchMap,
  tap,
  shareReplay,
  catchError,
  debounceTime,
  share,
} from 'rxjs';
import { RadixConnectService } from '../radix-connect.service';
import { TransactionStatus } from '@radixdlt/radix-dapp-toolkit';
import { PrecisionPoolComponent } from '../precision-pool/precision-pool.component';
import { TokenInputComponent } from '../token-input/token-input.component';
import {
  AddLiquidityPreview,
  OciswapService,
  SwapPreview,
} from '../ociswap.service';
import Decimal from 'decimal.js';
import Fuse from 'fuse.js';
import { PoolDetailsComponent } from '../pool-details/pool-details.component';
import { PoolService } from '../pool.service';
import { VolumeChartComponent } from '../volume-chart/volume-chart.component';
import { YieldListComponent } from '../yield-list/yield-list.component';
import { StrategyCardComponent } from '../strategy-card/strategy-card.component';

interface StrategyFilters {
  requiredAssets: string[];
  rewardTokens: string[];
  apy: ApyFilter;
}

interface ApyFilter {
  condition: 'above' | 'below';
  value: number | null;
}

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PrecisionPoolComponent,
    TokenInputComponent,
    PoolDetailsComponent,
    VolumeChartComponent,
    YieldListComponent,
    StrategyCardComponent,
  ],
  templateUrl: './strategies.component.html',
  styleUrls: ['./strategies.component.css'],
})
export class StrategiesComponent {
  isComingSoon = false;

  showModal = false;

  isFaqSectionOpen = false;

  selectedStrategy: Strategy | null = null;

  ltvValue = '45';

  lowPrice = 0;
  highPrice = 0;

  xAmount = '';
  yAmount = '';

  searchTerm = '';
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable().pipe(debounceTime(300));

  sliderMin = -90;
  sliderMax = 900;
  minValue = -90;
  maxValue = 900;
  minPercentage = 0;
  maxPercentage = 100;
  selectedPriceRange: 'wide' | 'concentrated' | 'bold' | 'manual' = 'wide';
  addLiquidityPreview: Observable<AddLiquidityPreview | null> = of(null);
  swapPreview: Observable<SwapPreview | null> = of(null);
  copied = false;

  sevenDayVolume: number[] = [3000, 5000, 2000, 8000, 6500, 4500, 7000];
  maxVolume = 0;
  lastSevenDays: Date[] = [];

  faqs = [
    {
      question: 'What is a DeFi strategy?',
      answer:
        'A DeFi strategy is a composition of actions where Attos Earn constructs various DApps into a single transaction. These strategies combine multiple decentralized finance protocols and actions to potentially maximize returns or achieve specific financial goals. By bundling these actions, Attos Earn simplifies complex DeFi interactions for users.',
      isOpen: false,
    },
    {
      question: 'What are the risks associated with DeFi strategies?',
      answer:
        "There are several risks to consider with DeFi strategies: 1) Token volatility: Some tokens are more volatile than others, which can affect strategy performance. 2) Variable fees: Fees are always variable depending on market conditions, which can impact returns. 3) Smart contract risks: As with all DeFi applications, there's always a risk associated with smart contract vulnerabilities. 4) Market risks: DeFi markets can be highly unpredictable and subject to rapid changes.",
      isOpen: false,
    },
    {
      question: 'Does Attos Earn implement any custom smart contracts?',
      answer:
        "No, Attos Earn utilizes existing DApps in the ecosystem. We don't implement custom smart contracts. You can find the respective audits for the DApps we use from their respective platforms. This approach leverages the security and reliability of established protocols in the DeFi space.",
      isOpen: false,
    },
    {
      question: 'Why are there remainder amounts from a strategy?',
      answer:
        'Remainder amounts often occur due to the complexity of calculating borrowable amounts and splitting them into an amount to swap to the second token in a pool. This process involves multiple variables and market conditions. While Attos Earn tries to minimize remainders, they are usually unavoidable due to the precise nature of these calculations and the dynamic state of the DeFi markets.',
      isOpen: false,
    },
  ];

  private strategiesService = inject(StrategiesService);
  private radixConnectService = inject(RadixConnectService);
  private poolService = inject(PoolService);

  strategiesV2$ = this.strategiesService.getStrategiesV2().pipe(share());

  lendingStrategies$ = this.strategiesV2$.pipe(
    map(strategies =>
      strategies
        .filter(s => s.strategy_type === 'Lending')

        .sort((a, b) => +b.bonus_value - +a.bonus_value)
    ),
    share()
  );

  topLendingStrategies$ = this.lendingStrategies$.pipe(
    map(strategies => strategies.slice(0, 4))
  );

  lendingTotalTvl$ = this.lendingStrategies$.pipe(
    map(strategies =>
      strategies
        .reduce((total, strategy) => {
          const deposited = new Decimal(strategy.deposited ?? '0');
          return total.plus(deposited);
        }, new Decimal(0))
        .toFixed(2)
    ),
    share()
  );

  stakingStrategies$ = this.strategiesV2$.pipe(
    map(strategies =>
      strategies
        .filter(s => s.strategy_type === 'Staking')
        .sort((a, b) => +b.bonus_value - +a.bonus_value)
    ),
    share()
  );

  stakingTotalTvl$ = this.stakingStrategies$.pipe(
    map(strategies =>
      strategies
        .reduce((total, strategy) => {
          const deposited = new Decimal(strategy.total_stake ?? '0');
          return total.plus(deposited);
        }, new Decimal(0))
        .toFixed(2)
    ),
    share()
  );

  topStakingStrategies$ = this.stakingStrategies$.pipe(
    map(strategies => strategies.slice(0, 4))
  );

  liquidationStrategies$ = this.strategiesV2$.pipe(
    map(strategies =>
      strategies
        .filter(s => s.strategy_type === 'Liquidation')
        .sort((a, b) => +b.bonus_value - +a.bonus_value)
    )
  );

  topLiquidationStrategies$ = this.liquidationStrategies$.pipe(
    map(strategies => strategies.slice(0, 4))
  );
  liquidationTotalTvl$ = this.liquidationStrategies$.pipe(
    map(strategies =>
      strategies
        .reduce((total, strategy) => {
          const deposited = new Decimal(strategy.deposited ?? '0');
          return total.plus(deposited);
        }, new Decimal(0))
        .toFixed(2)
    ),
    share()
  );

  ociswapService = inject(OciswapService);

  sevenDayVolume$: Observable<Record<string, number>> | undefined;

  requiredAssetsFilter: string[] = [];
  rewardTokensFilter: string[] = [];
  apyFilter: ApyFilter = { condition: 'above', value: null };

  private filtersSubject = new BehaviorSubject<StrategyFilters>({
    requiredAssets: this.requiredAssetsFilter,
    rewardTokens: this.rewardTokensFilter,
    apy: this.apyFilter,
  });
  filters$ = this.filtersSubject.asObservable();

  private strategies$ = this.strategiesService
    .getStrategies()
    .pipe(shareReplay(1));

  allRequiredAssets$: Observable<string[]> = this.strategies$.pipe(
    map(strategies => [
      ...new Set(strategies.flatMap(s => s.requiredAssets.map(a => a.symbol))),
    ])
  );

  allRewardTokens$: Observable<string[]> = this.strategies$.pipe(
    map(strategies => [
      ...new Set(strategies.flatMap(s => s.rewardTokens || [])),
    ])
  );

  filteredStrategies$ = combineLatest([
    this.strategies$,
    this.filters$,
    this.search$,
  ]).pipe(
    map(([strategies, filters, searchTerm]) =>
      this.searchStrategies(
        this.applyAllFilters(strategies, filters),
        searchTerm
      )
    )
  );

  txButtonStatus = this.radixConnectService.getButtonStatus();

  inputAmounts: Record<string, number> = {};

  maxAmounts: Record<string, number> = {};

  inputErrors: Record<string, string> = {};

  requiredResources = new BehaviorSubject<string[]>([]);

  selectedAccount$ = this.radixConnectService.selectedAccount$;

  amountBorrowableWithoutLtv = '0';

  amountBorrowableWithLtv = '0';

  collapsedSections: {
    lending: boolean;
    staking: boolean;
    liquidation: boolean;
  } = {
    lending: true,
    staking: true,
    liquidation: true,
  };

  hasInputErrors(): boolean {
    return (
      Object.keys(this.inputErrors).length > 0 ||
      Object.values(this.inputAmounts).every(amount => amount === 0)
    );
  }

  combinedData$ = combineLatest([
    this.filteredStrategies$,
    this.radixConnectService.getWalletData(),
  ]).pipe(
    map(([strategies, walletData]) => ({
      strategies,
      balances:
        walletData?.fungibles.reduce(
          (acc, token) => {
            acc[token.resourceInfo.resourceAddress] = +token.balance;
            return acc;
          },
          {} as Record<string, number>
        ) || {},
      selectedAccount: walletData?.account,
    })),
    tap(data => {
      this.maxAmounts = data.balances;
    })
  );

  transactionResult: Observable<TransactionStatus | undefined> = of(undefined);

  setRequiredResources(requiredResources: string[]) {
    this.requiredResources.next(requiredResources);
  }

  openExecuteModal(strategy: Strategy) {
    this.showModal = true;
    this.selectedStrategy = strategy;
    this.setRequiredResources(
      strategy.requiredAssets.map(asset => asset.resource_address)
    );

    if (strategy.poolInfo) {
      this.sevenDayVolume$ = this.poolService
        .getPoolVolumePerDay(
          strategy.poolInfo?.component,
          strategy.poolInfo.type
        )
        .pipe(map(volumeData => volumeData.volume_per_day));
    }

    // Reset LTV value when opening modal
    this.ltvValue = strategy.optimalLtv;
    // Calculate low and high prices
    this.calculatePriceRange();
  }

  updateLtv(event: Event) {
    this.ltvValue = (event.target as HTMLInputElement).value;

    this.amountBorrowableWithLtv = new Decimal(this.amountBorrowableWithoutLtv)
      .mul((+this.ltvValue || 0) / 100)
      .toFixed(18);
  }

  closeModal() {
    this.showModal = false;
    this.selectedStrategy = null;
    this.transactionResult.subscribe().unsubscribe();
    this.transactionResult = of(undefined);
  }

  setMaxBalance(resourceAddress: string, amount: number) {
    this.inputAmounts[resourceAddress] = amount;
    delete this.inputErrors[resourceAddress];
  }

  executeStrategy(accountAddress?: string) {
    if (this.selectedStrategy && accountAddress) {
      this.transactionResult = this.strategiesService
        .executeStrategy(
          this.selectedStrategy.id,
          accountAddress,
          this.inputAmounts[
            this.selectedStrategy.requiredAssets[0].resource_address
          ],
          this.ltvValue,
          this.selectedStrategy.buyToken || null,
          this.selectedStrategy.component || null,
          this.selectedStrategy.poolType === 'precision' ? this.minValue : null,
          this.selectedStrategy.poolType === 'precision' ? this.maxValue : null,
          this.xAmount,
          this.yAmount
        )
        .pipe(
          map(response => {
            if (response.manifest) {
              return response;
            }
            throw TransactionStatus.Unknown;
          }),
          switchMap(async response => {
            return this.radixConnectService
              .sendTransaction(response.manifest)
              ?.map(f => f.status)
              .mapErr(() => TransactionStatus.Rejected);
          }),
          map(tx => {
            if (tx?.isOk()) {
              return tx.value;
            } else {
              return 'Rejected';
            }
          }),
          catchError(error => {
            return of(error);
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

  updateBalance(resourceAddress: string, event: Event) {
    const inputValue = +(event.target as HTMLInputElement).value;
    const maxBalance = this.maxAmounts[resourceAddress] || 0;

    if (inputValue > maxBalance) {
      this.inputErrors[resourceAddress] = 'Amount exceeds available balance';
      this.inputAmounts[resourceAddress] = maxBalance;
    } else {
      delete this.inputErrors[resourceAddress];
      this.inputAmounts[resourceAddress] = inputValue;
    }

    this.amountBorrowableWithoutLtv = new Decimal(inputValue)
      .div(this.selectedStrategy?.lendingPriceUsd || 0)
      .toFixed(18);

    this.amountBorrowableWithLtv = new Decimal(this.amountBorrowableWithoutLtv)
      .mul((+this.ltvValue || 0) / 100)
      .toFixed(18);
  }

  updatePriceRange() {
    // Ensure minValue is always less than or equal to maxValue
    if (this.minValue > this.maxValue) {
      const temp = this.minValue;
      this.minValue = this.maxValue;
      this.maxValue = temp;
    }

    // If manual is not selected, update the selectedPriceRange
    if (this.selectedPriceRange !== 'manual') {
      if (this.minValue === -90 && this.maxValue === 900) {
        this.selectedPriceRange = 'wide';
      } else if (this.minValue === -50 && this.maxValue === 100) {
        this.selectedPriceRange = 'concentrated';
      } else if (this.minValue === -20 && this.maxValue === 25) {
        this.selectedPriceRange = 'bold';
      } else {
        this.selectedPriceRange = 'manual';
      }
    }

    // Calculate new price range
    this.calculatePriceRange();
  }

  setPriceRange(range: 'wide' | 'concentrated' | 'bold' | 'manual') {
    this.selectedPriceRange = range;
    switch (range) {
      case 'wide':
        this.minValue = -90;
        this.maxValue = 900;
        break;
      case 'concentrated':
        this.minValue = -50;
        this.maxValue = 100;
        break;
      case 'bold':
        this.minValue = -20;
        this.maxValue = 25;
        break;
      case 'manual':
        // Do nothing, allow user to adjust
        break;
    }
    this.updatePriceRange();
  }

  calculatePriceRange() {
    if (this.selectedStrategy && this.selectedStrategy.currentPrice) {
      const currentPrice = this.selectedStrategy.currentPrice;

      if (currentPrice) {
        this.lowPrice = +currentPrice * (1 + this.minValue / 100);
        this.highPrice = +currentPrice * (1 + this.maxValue / 100);
      }
    }
  }

  // Add these methods to handle updates from PrecisionPoolComponent
  updateMinValue(value: number) {
    this.minValue = value;
    this.updatePriceRange();
    this.updateAmount();
  }

  updateMaxValue(value: number) {
    this.maxValue = value;
    this.updatePriceRange();
    this.updateAmount();
  }

  private applyAllFilters(
    strategies: Strategy[],
    filters: StrategyFilters
  ): Strategy[] {
    let filteredStrategies = this.filterByRequiredAssetsAndRewardTokens(
      strategies,
      filters
    );
    filteredStrategies = this.filterByApy(filteredStrategies, filters.apy);
    return filteredStrategies;
  }

  private filterByRequiredAssetsAndRewardTokens(
    strategies: Strategy[],
    filters: StrategyFilters
  ): Strategy[] {
    return strategies.filter(strategy => {
      const requiredAssetsMatch =
        filters.requiredAssets.length === 0 ||
        filters.requiredAssets.every(asset =>
          strategy.requiredAssets.some(a => a.symbol === asset)
        );

      const rewardTokensMatch =
        filters.rewardTokens.length === 0 ||
        filters.rewardTokens.every(token =>
          strategy.rewardTokens?.includes(token)
        );

      return requiredAssetsMatch && rewardTokensMatch;
    });
  }

  private filterByApy(strategies: Strategy[], filter: ApyFilter): Strategy[] {
    if (filter.value === null) return strategies;
    return strategies.filter(strategy => {
      const totalApy = strategy.totalRewards.value;
      return filter.condition === 'above'
        ? totalApy >= (filter.value ?? 0)
        : totalApy <= (filter.value ?? 0);
    });
  }

  updateFilters() {
    this.filtersSubject.next({
      requiredAssets: this.requiredAssetsFilter,
      rewardTokens: this.rewardTokensFilter,
      apy: this.apyFilter,
    });
  }

  resetFilters() {
    this.requiredAssetsFilter = [];
    this.rewardTokensFilter = [];
    this.apyFilter = { condition: 'above', value: null };
    this.updateFilters();
  }

  updateXAmount(amount: string, ratio: string | null | undefined) {
    this.xAmount = amount;

    if (this.selectedStrategy?.poolInfo?.sub_type !== 'single') {
      this.yAmount =
        this.selectedStrategy?.poolInfo?.type === 'defiplaza'
          ? new Decimal(this.xAmount).mul(ratio || 0).toFixed(18)
          : new Decimal(this.xAmount)
              .mul(this.selectedStrategy?.poolInfo?.current_price || 0)
              .toString();
    }
    this.validateInput(this.selectedStrategy?.poolInfo?.left_token || '');
    this.validateInput(this.selectedStrategy?.poolInfo?.right_token || '');
  }

  updateYAmount(amount: string, ratio: string | null | undefined) {
    this.yAmount = amount;

    if (this.selectedStrategy?.poolInfo?.sub_type !== 'single') {
      this.xAmount =
        this.selectedStrategy?.poolInfo?.type === 'defiplaza'
          ? new Decimal(this.yAmount).mul(ratio || 0).toFixed(18)
          : new Decimal(this.yAmount)
              .div(
                new Decimal(
                  this.selectedStrategy?.poolInfo?.current_price || 0
                ).plus(
                  new Decimal(
                    this.selectedStrategy?.poolInfo?.current_price || 0
                  ).times(0.5)
                )
              )
              .toString();
    }
    this.validateInput(this.selectedStrategy?.poolInfo?.left_token || '');
    this.validateInput(this.selectedStrategy?.poolInfo?.right_token || '');
  }

  private updateAmount() {
    if (
      this.selectedStrategy &&
      this.selectedStrategy.currentPrice &&
      this.selectedStrategy?.component
    ) {
      const { lowerTick, upperTick } = this.ociswapService.calculateTickBounds(
        this.selectedStrategy.currentPrice,
        this.minValue,
        this.maxValue,
        60
      );
      this.addLiquidityPreview = this.ociswapService
        .getOciswapAddLiquidityPreview(
          this.selectedStrategy.component,
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

              this.swapPreview = this.ociswapService.getOciswapSwapPreview(
                this.selectedStrategy?.poolInfo?.left_token || '',
                '',
                this.selectedStrategy?.poolInfo?.right_token || '',
                this.yAmount
              );
            }
          }),
          catchError(() => {
            this.inputErrors[this.selectedStrategy?.buyToken || ''] =
              'An error occurred while fetching add liquidity preview.';
            return of(null);
          })
        );
    }
  }

  validateInput(resourceAddress: string) {
    if (!this.selectedStrategy) return;

    console.log(resourceAddress);
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  private searchStrategies(strategies: Strategy[], term: string): Strategy[] {
    if (!term) return strategies;

    const fuse = new Fuse(strategies, {
      keys: [
        'name',
        'description',
        'requiredAssets.symbol',
        'rewardTokens',
        'poolInfo.name',
        'poolInfo.left_name',
        'poolInfo.right_name',
        'poolInfo.type',
        'poolInfo.sub_type',
      ],
      threshold: 0.3,
      ignoreLocation: true,
    });

    return fuse.search(term).map(result => result.item);
  }

  async copyComponentAddress(address: string | undefined) {
    if (address) {
      await navigator.clipboard.writeText(address);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000); // Reset after 2 seconds
    }
  }

  toggleFaqSection() {
    this.isFaqSectionOpen = !this.isFaqSectionOpen;
  }

  toggleFaq(index: number) {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  toggleStrategySection(section: keyof typeof this.collapsedSections) {
    this.collapsedSections = {
      ...this.collapsedSections,
      [section]: !this.collapsedSections[section],
    };
  }
}
