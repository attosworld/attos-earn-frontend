import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PortfolioItem {
  poolName: string;
  leftIcon: string;
  rightIcon: string;
  leftAlt: string;
  rightAlt: string;
  invested: number;
  currentValue: number;
  investedXrd: number;
  currentValueXrd: number;
  pnl: number;
  pnlPercentage: number;
  provider: string;
  closeManifest: string;
  strategy?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private apiUrl = `${environment.apiUrl}/portfolio`;

  constructor(private http: HttpClient) {}

  getPortfolioItems(account: string): Observable<PortfolioItem[]> {
    return this.http.get<PortfolioItem[]>(`${this.apiUrl}?address=${account}`);
  }
}
