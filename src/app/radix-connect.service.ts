import { Injectable } from '@angular/core';
import {
  RadixDappToolkit,
  RadixNetwork,
  DataRequestBuilder,
} from '@radixdlt/radix-dapp-toolkit';
import { BehaviorSubject, forkJoin, from, of, switchMap, tap } from 'rxjs';
import { GatewayEzMode } from '@calamari-radix/gateway-ez-mode';

@Injectable({
  providedIn: 'root',
})
export class RadixConnectService {
  gatewayEz = new GatewayEzMode();

  rdt?: RadixDappToolkit;

  accounts$ = new BehaviorSubject<string[] | undefined>([]);

  init() {
    this.rdt = RadixDappToolkit({
      dAppDefinitionAddress:
        'account_rdx12y7md4spfq5qy7e3mfjpa52937uvkxf0nmydsu5wydkkxw3qx6nghn',
      networkId: RadixNetwork.Mainnet,
      applicationName: 'Attos Earn',
      applicationVersion: '1.0.0',
      // logger: Logger(1),
    });
    this.rdt.buttonApi.setMode('dark');
    this.rdt.buttonApi.setTheme('white');
    this.rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
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
          this.accounts$.next(data.accounts.map(account => account.address));
        }
      }),
      switchMap(data => {
        if (!data.accounts.length) {
          return of(undefined);
        }

        const address = data.accounts[0].address;
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
}
