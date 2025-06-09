import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Pool {
  type: string;
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
  ): Observable<{ volume_per_day: number[] }> {
    return this.http.get<{ volume_per_day: number[] }>(
      `${this.apiUrl}/volume/${component}?provider=${provider}`
    );
  }
}
