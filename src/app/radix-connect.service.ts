import { Injectable } from '@angular/core';
import {
  RadixDappToolkit,
  RadixNetwork,
  DataRequestBuilder,
  WalletDataStateAccount,
} from '@radixdlt/radix-dapp-toolkit';
import { BehaviorSubject, forkJoin, from, of, switchMap, tap } from 'rxjs';
import { GatewayEzMode } from '@calamari-radix/gateway-ez-mode';

@Injectable({
  providedIn: 'root',
})
export class RadixConnectService {
  setSelectedAccount(account: WalletDataStateAccount) {
    this.selectedAccount$.next(account);
  }

  gatewayEz = new GatewayEzMode();

  rdt?: RadixDappToolkit;

  accounts$ = new BehaviorSubject<WalletDataStateAccount[] | undefined>([]);

  selectedAccount$ = new BehaviorSubject<WalletDataStateAccount | undefined>(
    undefined
  );

  constructor() {
    this.init();
  }

  init() {
    this.rdt = RadixDappToolkit({
      dAppDefinitionAddress:
        'account_rdx12xpquh9jpf0tekllepvcenhpwdxc3k25qrlhljmylmrksahmcemaw3',
      networkId: RadixNetwork.Mainnet,
      applicationName: 'Attos Earn',
      applicationVersion: '1.0.0',
      // logger: Logger(1),
    });
    this.rdt.buttonApi.setMode('dark');
    this.rdt.buttonApi.setTheme('white');
    this.rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
  }

  getButtonStatus() {
    return this.rdt?.buttonApi.status$;
  }

  getSelectedAccount() {
    return this.getWalletData()?.pipe(
      switchMap(() => this.selectedAccount$.asObservable())
    );
  }

  getAccounts() {
    return this.getWalletData()?.pipe(
      switchMap(() => this.accounts$.asObservable())
    );
  }

  getWalletData() {
    return this.rdt?.walletApi.walletData$.pipe(
      tap(data => {
        if (data.accounts.length) {
          this.accounts$.next(data.accounts);

          if (this.selectedAccount$.getValue() === undefined) {
            this.selectedAccount$.next(data.accounts[0]);
          }
        }
      }),
      switchMap(data => {
        const account = this.selectedAccount$.getValue();
        if (!data.accounts.length || !account) {
          return of(undefined);
        }

        const address = account.address;
        return forkJoin({
          account: address,
          fungibles: from(
            this.gatewayEz.state.getComponentFungibleBalances(address)
          ),
          nonFungibles: from(
            this.gatewayEz.state.getComponentNonFungibleBalances(address)
          ),
        });
      })
    );
  }

  sendTransaction(transactionManifest: string) {
    return this.rdt?.walletApi.sendTransaction({
      transactionManifest,
    });
  }
}
