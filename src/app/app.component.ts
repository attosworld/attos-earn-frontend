import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';
import { RadixConnectService } from './radix-connect.service';
import {
  TransactionStatus,
  WalletDataStateAccount,
} from '@radixdlt/radix-dapp-toolkit';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  finalize,
  from,
  map,
  Observable,
  of,
  share,
  switchMap,
} from 'rxjs';
import { AstrolescentService } from './astrolescent.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent implements OnInit {
  isMenuOpen = false;

  isMobile = false;

  currentYear = new Date().getFullYear();

  isAccountDropdownOpen = false;

  showBanner = true;

  radixConnect = inject(RadixConnectService);

  router = inject(Router);

  showSwapModal = false;
  swapAmount = '';
  swapError = '';

  // Subjects for reactive programming
  private swapAmountSubject = new BehaviorSubject<string>('1000');

  // Exposed observable for the template
  swapQuote$ = this.swapAmountSubject.pipe(
    debounceTime(500),
    switchMap(amount => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        this.swapError = 'Please enter a valid amount';
        return of(null);
      }

      this.isLoadingQuote = true;
      this.swapError = '';

      return this.selectedAccount$.pipe(
        switchMap(account => {
          if (!account) {
            return of(null);
          }

          return this.astrolescentService
            .getSwapDetails({
              inputToken: RadixConnectService.XRD,
              outputToken: RadixConnectService.DFP2,
              amount: amount,
              accountAddress: account.address,
            })
            .pipe(
              catchError(error => {
                console.error('Error getting swap quote:', error);
                this.swapError = 'Failed to get swap quote. Please try again.';
                return of(null);
              }),
              finalize(() => {
                this.isLoadingQuote = false;
              })
            );
        })
      );
    }),
    share()
  );

  selectedAccount$ = this.radixConnect.getSelectedAccount();

  accounts$ = this.radixConnect.getAccounts();

  baseBalances = this.radixConnect.getWalletData().pipe(
    map(balances => {
      const xrdBalance = balances?.fungibles.find(
        token => token.resourceInfo.resourceAddress === RadixConnectService.XRD
      );

      const dfp2Balance = balances?.fungibles.find(
        token => token.resourceInfo.resourceAddress === RadixConnectService.DFP2
      );

      return {
        XRD: {
          balance: xrdBalance?.balance,
          iconUrl: xrdBalance?.resourceInfo.metadata.iconUrl,
        },
        DFP2: {
          balance: dfp2Balance?.balance,
          iconUrl: dfp2Balance?.resourceInfo.metadata.iconUrl,
        },
      };
    })
  );

  isLoadingQuote: boolean | null = null;

  astrolescentService = inject(AstrolescentService);
  topupStatus: Observable<string> = of('');

  ngOnInit() {
    this.checkScreenSize();
    this.checkBannerVisibility();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleAccountDropdown() {
    this.isAccountDropdownOpen = !this.isAccountDropdownOpen;
  }

  selectAccount(account: WalletDataStateAccount) {
    this.radixConnect.setSelectedAccount(account);
    this.isAccountDropdownOpen = false;
  }

  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      fragment: 'ignored',
      queryParams: 'ignored',
      matrixParams: 'ignored',
    });
  }

  shortenAddress(address: string): string {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  ultraShortenAddress(address: string): string {
    return address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';
  }

  checkBannerVisibility() {
    const bannerClosed = localStorage.getItem('bannerClosed');
    this.showBanner = bannerClosed !== 'true';
  }

  closeBanner() {
    this.showBanner = false;
    localStorage.setItem('bannerClosed', 'true');
  }

  openDFP2SwapModal() {
    this.showSwapModal = true;
    this.swapAmount = '1000';
    this.swapError = '';
  }

  closeSwapModal() {
    this.showSwapModal = false;
  }

  async executeSwap(manifest: string) {
    if (!this.swapQuote$) {
      this.swapError = 'Please get a quote first';
      return;
    }

    try {
      this.topupStatus = from(
        this.radixConnect
          .sendTransaction(manifest)
          ?.map(f => f.status)
          .mapErr(() => TransactionStatus.Rejected)
          .unwrapOr(TransactionStatus.Rejected) || TransactionStatus.Rejected
      );
    } catch (error) {
      console.error('Error executing swap:', error);
      this.swapError = 'Failed to execute swap. Please try again.';
    }
  }

  updateSwapAmount(event: Event) {
    this.swapAmount = (event.target as HTMLInputElement).value;
    this.swapAmountSubject.next(this.swapAmount);
  }

  setMaxAmount(max: string) {
    this.swapAmount = max;
    this.swapAmountSubject.next(this.swapAmount);
  }
}
