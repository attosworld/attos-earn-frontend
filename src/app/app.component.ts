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
import { WalletDataStateAccount } from '@radixdlt/radix-dapp-toolkit';
import { map } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
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
}
