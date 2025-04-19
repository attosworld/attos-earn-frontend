import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Pool } from './pool.service';

export interface Strategy {
  id: string;
  component?: string | null;
  buyToken?: string | null;
  name: string;
  description: string;
  steps: { icon: string; label: string }[];
  requiredAssets: { resource_address: string; symbol: string }[];
  rewardTokens: string[];
  totalRewards: { value: number; type: string };
  rewardsBreakdown: { token: string; apy: number }[];
  dappsUtilized: { icon: string; label: string }[];
  fieldsRequired: { fieldName: string; type: string }[];
  ltvLimit: string;
  ltvLiquidation: string;
  optimalLtv: string;
  poolType: 'double' | 'single' | 'precision' | 'flex' | 'basic';
  currentPrice?: string;
  buyingSymbol?: string;
  poolInfo?: Pool;
  lendingPriceUsd: number;
}

export interface ExecuteStrategyResponse {
  manifest: string;
}

@Injectable({
  providedIn: 'root',
})
export class StrategiesService {
  private apiUrl = environment.apiUrl;

  http = inject(HttpClient);

  getStrategies(): Observable<Strategy[]> {
    return this.http.get<Strategy[]>(`${this.apiUrl}/strategies`).pipe(
      catchError(error => {
        console.error('Error fetching strategies:', error);
        return of([]); // Return an empty array in case of error
      })
    );
  }

  executeStrategy(
    id: string,
    account: string,
    xrdAmount: number,
    ltv: string | undefined,
    buyToken: string | null,
    component: string | null,
    minPercentage: number | null,
    maxPercentage: number | null,
    xAmount: string | null,
    yAmount: string | null
  ): Observable<ExecuteStrategyResponse> {
    let params = new HttpParams()
      .set('id', id.toString())
      .set('account', account)
      .set('token_amount', xrdAmount.toString())
      .set('ltv', ltv ?? '')
      .set('x_token_amount', xAmount ?? '')
      .set('y_token_amount', yAmount ?? '');

    if (buyToken) {
      params = params.set('buy_token', buyToken);
    }
    if (component) {
      params = params.set('component', component);
    }
    if (minPercentage && maxPercentage) {
      params = params.set('min_percentage', minPercentage.toString());
      params = params.set('max_percentage', maxPercentage.toString());
    }

    return this.http
      .get<ExecuteStrategyResponse>(`${this.apiUrl}/strategies/execute`, {
        params,
      })
      .pipe(
        catchError(error => {
          console.error('Error executing strategy:', error);
          throw error; // Rethrow the error to be handled by the component
        })
      );
  }
}
