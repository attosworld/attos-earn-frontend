import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AstrolescentSwapRequest {
  inputToken: string;
  outputToken: string;
  amount: string;
  accountAddress: string;
}

export interface AstrolescentSwapResponse {
  inputTokens: number;
  outputTokens: number;
  priceImpact: number;
  swapFee: string;
  manifest: string;
  routes: {
    pools: {
      type: string;
      baseToken: string;
      quoteToken: string;
    }[];
    startPrice: string;
    endPrice: string;
    impact: number;
    tokensIn: number;
    tokensOut: number;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class AstrolescentService {
  http = inject(HttpClient);

  getSwapDetails(
    request: AstrolescentSwapRequest
  ): Observable<AstrolescentSwapResponse> {
    return this.http.post<AstrolescentSwapResponse>(
      `${environment.apiUrl}/swap`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
