import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StrategiesService, Strategy } from '../strategies.service';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  finalize,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { RadixConnectService } from '../radix-connect.service';
import { TransactionStatus } from '@radixdlt/radix-dapp-toolkit';

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './strategies.component.html',
  styleUrls: ['./strategies.component.css'],
})
export class StrategiesComponent {
  isComingSoon = false;

  showModal = false;

  selectedStrategy: Strategy | null = null;

  strategiesService = inject(StrategiesService);

  strategies$: Observable<Strategy[]> = this.strategiesService.getStrategies();

  radixConnectService = inject(RadixConnectService);

  txButtonStatus = this.radixConnectService.getButtonStatus();

  inputAmounts: Record<string, number> = {};

  requiredResources = new BehaviorSubject<string[]>([]);

  selectedAccount$ = this.radixConnectService.selectedAccount$;

  combinedData$ = combineLatest([
    this.strategies$,
    this.requiredResources,
    this.selectedAccount$,
  ]).pipe(
    switchMap(
      ([strategies, requiredResources, selectedAccount]) =>
        this.radixConnectService.getWalletData()?.pipe(
          map(walletData => {
            const balances =
              walletData?.fungibles
                .filter(fungible =>
                  requiredResources.includes(
                    fungible.resourceInfo.resourceAddress
                  )
                )
                .reduce(
                  (acc, fungible) => {
                    acc[fungible.resourceInfo.resourceAddress] =
                      +fungible.balance;
                    return acc;
                  },
                  {} as Record<string, number>
                ) || {};

            return {
              strategies,
              requiredResources,
              selectedAccount: selectedAccount?.address,
              balances,
            };
          })
        ) || of(null)
    )
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
  }

  closeModal() {
    this.showModal = false;
    this.selectedStrategy = null;
  }

  setMaxBalance(resourceAddress: string, amount: number) {
    this.inputAmounts[resourceAddress] = amount;
  }

  executeStrategy(accountAddress?: string) {
    if (this.selectedStrategy && accountAddress) {
      this.transactionResult = this.strategiesService
        .executeStrategy(
          this.selectedStrategy.id,
          accountAddress,
          this.inputAmounts[
            this.selectedStrategy.requiredAssets[0].resource_address
          ]
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
    this.inputAmounts[resourceAddress] = +(event.target as HTMLInputElement)
      .value;
  }
}
