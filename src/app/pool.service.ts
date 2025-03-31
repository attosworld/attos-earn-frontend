import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Pool {
  type: string;
  component: string;
  tvl: number;
  bonus_24h: number;
  bonus_7d: number;
  base: string;
  quote: string;
  volume_7d: number;
  volume_24h: number;
  bonus_name: string;
  left_alt: string;
  right_alt: string;
  left_icon: string;
  right_icon: string;
  left_name: string;
  right_name: string;
  name: string;
  pool_type: 'double' | 'single';
  deposit_link: string;
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
}
