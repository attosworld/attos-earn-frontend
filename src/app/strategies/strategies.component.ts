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
  rewardTokens: string[]; // Add this new property
  totalRewards: {
    value: number;
    type: 'APY' | 'APR';
  };
}

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './strategies.component.html',
  styleUrls: ['./strategies.component.css'],
})
export class StrategiesComponent {
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
      rewardTokens: ['FARM', 'ETH'], // Add reward tokens
      totalRewards: {
        value: 12.5,
        type: 'APY',
      },
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
      rewardTokens: ['USDC'], // Add reward tokens
      totalRewards: {
        value: 8.7,
        type: 'APR',
      },
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
      rewardTokens: ['LPT', 'ETH'], // Add reward tokens
      totalRewards: {
        value: 15.2,
        type: 'APY',
      },
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
      rewardTokens: ['LPT', 'ETH'], // Add reward tokens
      totalRewards: {
        value: 15.2,
        type: 'APY',
      },
    },
  ];

  executeStrategy(strategyId: number) {
    console.log(`Executing strategy with ID: ${strategyId}`);
    // Implement the logic to execute the strategy
  }
}
