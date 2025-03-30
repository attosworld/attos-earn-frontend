import { Routes } from '@angular/router';
import { PoolListComponent } from './pool-list/pool-list.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { StrategiesComponent } from './strategies/strategies.component';

export const routes: Routes = [
  { path: '', redirectTo: '/pools', pathMatch: 'full' },
  { path: 'pools', component: PoolListComponent },
  { path: 'strategies', component: StrategiesComponent },
  { path: 'portfolio', component: PortfolioComponent },
];
