import { Routes } from '@angular/router';
import { PoolListComponent } from './pool-list/pool-list.component';
import { PortfolioComponent } from './portfolio/portfolio.component';

export const routes: Routes = [
  { path: '', redirectTo: '/pools', pathMatch: 'full' },
  { path: 'pools', component: PoolListComponent },
  { path: 'strategies', component: PoolListComponent }, // Replace with actual Strategies component when available
  { path: 'portfolio', component: PortfolioComponent },
];
