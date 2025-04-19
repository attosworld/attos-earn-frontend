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

interface Filters {
  requiredAssets: string[];
  rewardTokens: string[];
}

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PrecisionPoolComponent,
    TokenInputComponent,
  ],
  templateUrl: './strategies.component.html',
  styleUrls: ['./strategies.component.css'],
})
export class StrategiesComponent {
  isComingSoon = false;

  showModal = false;

  selectedStrategy: Strategy | null = null;

  ltvValue = '45';

  lowPrice = 0;
  highPrice = 0;

  xAmount = '';
  yAmount = '';

  sliderMin = -90;
  sliderMax = 900;
  minValue = -90;
  maxValue = 900;
  minPercentage = 0;
  maxPercentage = 100;
  selectedPriceRange: 'wide' | 'concentrated' | 'bold' | 'manual' = 'wide';
  addLiquidityPreview: Observable<AddLiquidityPreview | null> = of(null);
  swapPreview: Observable<SwapPreview | null> = of(null);

  private strategiesService = inject(StrategiesService);
  private radixConnectService = inject(RadixConnectService);
  ociswapService = inject(OciswapService);

  requiredAssetsFilter: string[] = [];
  rewardTokensFilter: string[] = [];

  private filtersSubject = new BehaviorSubject<Filters>({
    requiredAssets: [],
    rewardTokens: [],
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

  filteredStrategies$ = combineLatest([this.strategies$, this.filters$]).pipe(
    map(([strategies, filters]) =>
      this.applySrategiesFilters(strategies, filters)
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

  private applySrategiesFilters(
    strategies: Strategy[],
    filters: Filters
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

  applyFilters() {
    this.filtersSubject.next({
      requiredAssets: this.requiredAssetsFilter,
      rewardTokens: this.rewardTokensFilter,
    });
  }

  clearFilters() {
    this.requiredAssetsFilter = [];
    this.rewardTokensFilter = [];
    this.applyFilters();
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

    // const value =
    //   resourceAddress === this.selectedStrategy.poolInfo?.left_token
    //     ? this.xAmount
    //     : this.yAmount;
    // const maxAmount = this.maxAmounts[resourceAddress];

    //     if (parseFloat(value) > parseFloat(maxAmount)) {
    //       this.inputErrors[resourceAddress] =
    //         `Amount exceeds balance of ${maxAmount}`;
    //     } else {
    //       delete this.inputErrors[resourceAddress];
    //     }
  }
}
