import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Pool {
  type: string;
  side?: 'base' | 'quote';
  component: string;
  sub_type: string;
  xRatio: string;
  yRatio: string;
  tvl: number;
  bonus_24h: number;
  bonus_7d: number;
  base: string;
  quote: string;
  volume_7d: number;
  volume_24h: number;
  bonus_name: string;
  current_price: number;
  precision_price: number;
  left_alt?: string;
  left_icon?: string;
  right_alt?: string;
  right_icon?: string;
  left_token: string;
  left_name: string;
  right_name: string;
  right_token: string;
  name: string;
  pool_type: 'double' | 'single';
  deposit_link: string;
  boosted: boolean;
  incentivised_lp_docs: string;
  tags: string[];
  radix_incentivised?: boolean;
}

export interface PoolLiquidity {
  liquidityPoints: {
    price: number;
    x_amount: string;
    y_amount: string;
  }[];
  price: number;
}

@Injectable({
  providedIn: 'root',
})
export class PoolService {
  private apiUrl = `${environment.apiUrl}/pools`;

  constructor(private http: HttpClient) {}

  getPools(): Observable<Pool[]> {
    return this.http.get<Pool[]>(this.apiUrl);
  }

  getPoolVolumePerDay(
    component: string,
    provider: string
  ): Observable<{ volume_per_day: Record<string, number> }> {
    return this.http.get<{ volume_per_day: Record<string, number> }>(
      `${this.apiUrl}/volume/${component}?provider=${provider}`
    );
  }

  getPoolPerformance(
    baseToken: string,
    type: 'base' | 'quote' | string | undefined,
    component?: string
  ): Observable<Record<string, number>> {
    let params = new HttpParams()
      .set('base_token', baseToken)
      .set('type', type ? type : '');

    if (component) {
      params = params.set('component', component);
    }

    return this.http.get<Record<string, number>>(`${this.apiUrl}/performance`, {
      params,
    });
  }

  getPoolLiquidity(component: string): Observable<PoolLiquidity> {
    const params = new HttpParams().set('component', component);

    return this.http.get<PoolLiquidity>(`${this.apiUrl}/liquidity`, {
      params,
    });
  }
}
