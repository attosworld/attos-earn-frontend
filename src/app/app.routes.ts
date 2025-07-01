import { Routes } from '@angular/router';
import { PoolListComponent } from './pool-list/pool-list.component';
import { PortfolioComponent } from './portfolio/portfolio.component';
import { StrategiesComponent } from './strategies/strategies.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { TermsAndConditionsComponent } from './terms-and-conditions/terms-and-conditions.component';
import { HomeComponent } from './home/home.component';
import { WalletGuard } from './wallet.guard';
import { DiscordVerifyComponent } from './discord-verify/discord-verify.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [WalletGuard] },
  { path: 'pools', component: PoolListComponent },
  { path: 'strategies', component: StrategiesComponent },
  { path: 'portfolio', component: PortfolioComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-and-conditions', component: TermsAndConditionsComponent },
  { path: 'discord-verify', component: DiscordVerifyComponent },
];
