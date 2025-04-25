import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  currentYear = new Date().getFullYear();

  features = [
    {
      title: 'Aggregate Liquidity Pools',
      description: 'Source pools from Ociswap and DefiPlaza in one place',
      icon: 'fa-solid fa-water',
    },
    {
      title: 'DeFi Strategies',
      description:
        'Composable actions leveraging lending and DEX liquidity pools',
      icon: 'fa-solid fa-chess',
    },
    {
      title: 'Portfolio Management',
      description:
        'Track and manage LP pools and DeFi strategies, close positions in one transaction',
      icon: 'fa-solid fa-chart-line',
    },
    {
      title: 'Bonus Rewards',
      description:
        'Earn a bonus pot for participating in the Radix ecosystem when in profit',
      icon: 'fa-solid fa-gift',
    },
  ];

  dapps = [
    {
      name: 'Ociswap',
      logo: 'https://ociswap.com/icons/oci.png',
      href: 'https://ociswap.com/',
    },
    {
      name: 'DefiPlaza',
      logo: 'https://radix.defiplaza.net/assets/img/babylon/defiplaza-icon.png',
      href: 'https://radix.defiplaza.net/',
    },
    {
      name: 'RootFinance',
      logo: 'https://app.rootfinance.xyz/favicon.ico',
      href: 'https://app.rootfinance.xyz/',
    },
  ];
}
