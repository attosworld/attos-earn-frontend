import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Strategy {
  id: number;
  name: string;
  description: string;
  steps: {
    icon: string;
    label: string;
  }[];
  requiredAssets: string[];
  rewardTokens: string[];
  totalRewards: {
    value: number;
    type: 'APY' | 'APR';
  };
  rewardsBreakdown: {
    token: string;
    apy: number;
  }[];
}

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './strategies.component.html',
  styleUrls: ['./strategies.component.css'],
})
export class StrategiesComponent {
  isComingSoon = true; // Add this line

  strategies: Strategy[] = [
    {
      id: 1,
      name: 'Yield Farming',
      description:
        'Maximize returns by providing liquidity to multiple pools and earning rewards.',
      steps: [
        { icon: 'coins', label: 'Deposit' },
        { icon: 'lock', label: 'Stake' },
        { icon: 'seedling', label: 'Harvest' },
        { icon: 'sync', label: 'Reinvest' },
      ],
      requiredAssets: ['USDT', 'ETH'],
      rewardTokens: ['FARM', 'ETH'],
      totalRewards: {
        value: 12.5,
        type: 'APY',
      },
      rewardsBreakdown: [
        { token: 'FARM', apy: 8.5 },
        { token: 'ETH', apy: 4.0 },
      ],
    },
    {
      id: 2,
      name: 'Arbitrage Trading',
      description:
        'Profit from price differences across various decentralized exchanges.',
      steps: [
        { icon: 'shopping-cart', label: 'Buy Low' },
        { icon: 'exchange-alt', label: 'Transfer' },
        { icon: 'hand-holding-usd', label: 'Sell High' },
        { icon: 'redo', label: 'Repeat' },
      ],
      requiredAssets: ['USDC', 'BTC'],
      rewardTokens: ['USDC'],
      totalRewards: {
        value: 8.7,
        type: 'APR',
      },
      rewardsBreakdown: [{ token: 'USDC', apy: 8.7 }],
    },
    {
      id: 3,
      name: 'Liquidity Mining',
      description:
        'Earn rewards by providing liquidity to decentralized exchanges.',
      steps: [
        { icon: 'plus-circle', label: 'Add Liquidity' },
        { icon: 'clock', label: 'Wait' },
        { icon: 'gift', label: 'Collect Rewards' },
        { icon: 'chart-line', label: 'Compound' },
      ],
      requiredAssets: ['ETH', 'DAI'],
      rewardTokens: ['LPT', 'ETH'],
      totalRewards: {
        value: 15.2,
        type: 'APY',
      },
      rewardsBreakdown: [
        { token: 'LPT', apy: 10.5 },
        { token: 'ETH', apy: 4.7 },
      ],
    },
    {
      id: 4,
      name: 'Staking',
      description:
        'Lock up your tokens to support network operations and earn passive income.',
      steps: [
        { icon: 'wallet', label: 'Select Tokens' },
        { icon: 'lock', label: 'Stake' },
        { icon: 'clock', label: 'Wait' },
        { icon: 'coins', label: 'Claim Rewards' },
      ],
      requiredAssets: ['XRD'],
      rewardTokens: ['XRD'],
      totalRewards: {
        value: 7.5,
        type: 'APY',
      },
      rewardsBreakdown: [{ token: 'XRD', apy: 7.5 }],
    },
  ];

  executeStrategy(strategyId: number) {
    console.log(`Executing strategy with ID: ${strategyId}`);
    // Implement the logic to execute the strategy
  }
}
