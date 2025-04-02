import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface Strategy {
  id: number;
  name: string;
  description: string;
  steps: { icon: string; label: string }[];
  requiredAssets: { resource_address: string; symbol: string }[];
  rewardTokens: string[];
  totalRewards: { value: number; type: string };
  rewardsBreakdown: { token: string; apy: number }[];
  dappsUtilized: { icon: string; label: string }[];
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
    id: number,
    account: string,
    xrdAmount: number
  ): Observable<ExecuteStrategyResponse> {
    const params = new HttpParams()
      .set('id', id.toString())
      .set('account', account)
      .set('xrd_amount', xrdAmount.toString());

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
