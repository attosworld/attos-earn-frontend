import { inject, Injectable } from '@angular/core';
import {
  RadixDappToolkit,
  RadixNetwork,
  DataRequestBuilder,
  WalletDataStateAccount,
} from '@radixdlt/radix-dapp-toolkit';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  forkJoin,
  from,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { GatewayEzMode } from '@calamari-radix/gateway-ez-mode';
import {
  FungibleResourceBalance,
  NftBalance,
} from '@calamari-radix/gateway-ez-mode/dist/types';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '../environments/environment';

export interface Balances {
  account: string;
  fungibles: FungibleResourceBalance[];
  nonFungibles: NftBalance[];
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  social_urls?: string[];
  description?: string;
  info_url?: string;
}

export interface ResourceRoleAndInfo {
  metadata: TokenMetadata;
  divisibility: number;
  mintable: boolean;
  burnable: boolean;
  withdrawable: boolean;
  depositable: boolean;
  totalMinted: string;
  totalSupply: string;
  totalBurned: string;
}

@Injectable({
  providedIn: 'root',
})
export class RadixConnectService {
  static XRD =
    'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';

  static DFP2 =
    'resource_rdx1t5ywq4c6nd2lxkemkv4uzt8v7x7smjcguzq5sgafwtasa6luq7fclq';
  rolaResponse = new Subject<boolean>();

  setSelectedAccount(account: WalletDataStateAccount) {
    this.selectedAccount$.next(account);
  }

  gatewayEz = new GatewayEzMode();

  rdt?: RadixDappToolkit;

  accounts$ = new BehaviorSubject<WalletDataStateAccount[] | undefined>([]);

  selectedAccount$ = new BehaviorSubject<WalletDataStateAccount | undefined>(
    undefined
  );

  refresh$ = new BehaviorSubject<boolean>(true);

  accountBalanceCache$ = new BehaviorSubject<Record<string, Balances>>({});

  isLoadingBalances = false;

  router = inject(Router);

  constructor() {
    this.init();
    const routerEvent = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.includes('discord-verify')) {
          this.rdt?.destroy();
          this.initDiscordVerification();
        }

        routerEvent.unsubscribe();
      });
  }

  init() {
    this.rdt = RadixDappToolkit({
      dAppDefinitionAddress:
        'account_rdx12xpquh9jpf0tekllepvcenhpwdxc3k25qrlhljmylmrksahmcemaw3',
      networkId: RadixNetwork.Mainnet,
      applicationName: 'Attos Earn',
      applicationVersion: '1.0.0',
    });
    this.rdt.buttonApi.setMode('dark');
    this.rdt.buttonApi.setTheme('white');
    this.rdt.walletApi.setRequestData(DataRequestBuilder.accounts().atLeast(1));
  }

  initDiscordVerification() {
    this.rdt = RadixDappToolkit({
      dAppDefinitionAddress:
        'account_rdx12xpquh9jpf0tekllepvcenhpwdxc3k25qrlhljmylmrksahmcemaw3',
      networkId: RadixNetwork.Mainnet,
      applicationName: 'Attos Earn',
      applicationVersion: '1.0.0',
    });
    this.rdt?.disconnect();
    this.rdt.buttonApi.setMode('dark');
    this.rdt.buttonApi.setTheme('white');
    this.rdt.walletApi.setRequestData(
      DataRequestBuilder.accounts().atLeast(1).withProof()
    );
    const getChallenge: () => Promise<string> = () =>
      fetch(`${environment.apiUrl}/rola/create-challenge`)
        .then(res => res.json())
        .then(res => res.challenge);

    this.rdt.walletApi.provideChallengeGenerator(getChallenge);

    this.rdt.walletApi.dataRequestControl(async ({ proofs }) => {
      const token = sessionStorage.getItem('discord_access_token') || '';
      const { valid } = await fetch(`${environment.apiUrl}/rola/verify`, {
        method: 'POST',
        body: JSON.stringify(proofs),
        headers: { 'content-type': 'application/json', Authorization: token },
      }).then((res): Promise<{ valid: boolean }> => res.json());

      this.rolaResponse.next(valid);
    });
  }

  getRolaResponse() {
    return this.rolaResponse.asObservable();
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
    if (!this.rdt) {
      return of({
        account: '',
        fungibles: [],
        nonFungibles: [],
      } as Balances);
    }

    return combineLatest([
      this.rdt?.walletApi.walletData$,
      this.accountBalanceCache$,
      this.selectedAccount$,
      this.refresh$,
    ]).pipe(
      tap(([data]) => {
        if (data.accounts.length) {
          this.accounts$.next(data.accounts);

          if (this.selectedAccount$.getValue() === undefined) {
            this.selectedAccount$.next(data.accounts[0]);
          }
        }
      }),
      switchMap(([data, , , refresh]) => {
        this.isLoadingBalances = true;
        const account = this.selectedAccount$.getValue();
        if (!data.accounts.length || !account) {
          return of({
            account: '',
            fungibles: [],
            nonFungibles: [],
          } as Balances);
        }

        const address = account.address;

        if (this.accountBalanceCache$.getValue()[address] && !refresh) {
          return this.accountBalanceCache$
            .asObservable()
            .pipe(map(balances => balances[address]));
        }

        console.log('triggered refresh');
        return forkJoin({
          account: of(address),
          fungibles: from(
            this.gatewayEz.state.getComponentFungibleBalances(address)
          ),
          nonFungibles: from(
            this.gatewayEz.state.getComponentNonFungibleBalances(address)
          ),
        });
      }),
      tap(data => {
        if (
          data &&
          !this.accountBalanceCache$.getValue()[data.account] &&
          !this.isLoadingBalances
        ) {
          this.accountBalanceCache$.next({
            ...this.accountBalanceCache$.getValue(),
            [data.account]: data as Balances,
          });
        }
      })
    );
  }

  updateBalanceCache(address?: string): Observable<Balances | undefined> {
    const accountAddress = address || this.selectedAccount$.getValue()?.address;

    if (!accountAddress) {
      return of(undefined);
    }

    return forkJoin({
      account: of(accountAddress),
      fungibles: from(
        this.gatewayEz.state.getComponentFungibleBalances(accountAddress)
      ),
      nonFungibles: from(
        this.gatewayEz.state.getComponentNonFungibleBalances(accountAddress)
      ),
    }).pipe(
      tap(data => {
        // Update the cache with the new balance data
        this.accountBalanceCache$.next({
          ...this.accountBalanceCache$.getValue(),
          [accountAddress]: data as Balances,
        });
      }),
      map(data => data as Balances)
    );
  }

  sendTransaction(transactionManifest: string) {
    return this.rdt?.walletApi
      .sendTransaction({
        transactionManifest,
      })
      .map(res => {
        // if (res.status === 'CommittedSuccess') {
        this.refresh$.next(true);
        // }
        return res;
      });
  }

  getTokenDetails(tokenAddresses: string[]): Observable<ResourceRoleAndInfo[]> {
    return from(
      this.gatewayEz.gateway.state.getEntityDetailsVaultAggregated(
        tokenAddresses
      )
    ).pipe(
      map(tokens => {
        return tokens
          .sort(a => (a.address === tokenAddresses[0] ? -1 : 1))
          .map(t => {
            const metadata = t.metadata.items.reduce<TokenMetadata>(
              (acc, item) => {
                if ('value' in item && 'value' in item.value.typed) {
                  const key = item.key as keyof TokenMetadata;
                  const value = item.value.typed.value;

                  if (typeof value === 'string') {
                    acc[
                      key as keyof { description: string; info_url: string }
                    ] = value;
                  }
                }

                if ('values' in item.value.typed) {
                  const key = item.key as keyof TokenMetadata;
                  acc[key as keyof { social_urls: string[] }] = (
                    item.value.typed.values as string[]
                  ).sort();
                }
                return acc;
              },
              {} as TokenMetadata
            );

            const flags = {} as {
              mintable: boolean;
              burnable: boolean;
              withdrawable: boolean;
              depositable: boolean;
              totalMinted: string;
              totalSupply: string;
              totalBurned: string;
              divisibility: number;
            };

            if (t.details?.type === 'FungibleResource') {
              if (t.details.role_assignments) {
                t.details.role_assignments.entries.forEach(entry => {
                  const roleName = entry.role_key.name;
                  const isAllowed =
                    ('explicit_rule' in entry.assignment &&
                      (entry.assignment.explicit_rule as { type: string })
                        ?.type !== 'DenyAll') ||
                    entry.assignment.resolution === 'Owner';

                  switch (roleName) {
                    case 'minter':
                      flags.mintable = isAllowed;
                      break;
                    case 'burner':
                      flags.burnable = isAllowed;
                      break;
                    case 'withdrawer':
                      flags.withdrawable = isAllowed;
                      break;
                    case 'depositor':
                      flags.depositable = isAllowed;
                      break;
                  }
                });
                flags.totalMinted = t.details.total_minted;
                flags.totalSupply = t.details.total_supply;
                flags.totalBurned = t.details.total_burned;
                flags.divisibility = t.details.divisibility;
              }
            }

            return {
              ...flags,
              metadata,
            };
          });
      })
    );
  }
}
