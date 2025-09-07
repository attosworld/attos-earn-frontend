import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AssetPrice {
  assetName: string;
  assetPrice: number;
}

export interface RootMarketPrices {
  prices: AssetPrice[];
}

@Injectable({
  providedIn: 'root',
})
export class RootFinanceService {
  private apiUrl = 'https://backend-prod.rootfinance.xyz/api/markets/prices';

  http = inject(HttpClient);

  getRootMarketPrices(): Observable<RootMarketPrices> {
    return this.http.get<RootMarketPrices>(this.apiUrl, {
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-GB,en;q=0.7',
      },
    });
  }
}
