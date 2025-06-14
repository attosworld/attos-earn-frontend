import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PortfolioItem {
  poolName: string;
  component: string;
  tx?: string;
  leftIcon: string;
  rightIcon: string;
  leftAlt: string;
  rightAlt: string;
  invested: string;
  currentValue: string;
  investedXrd: string;
  currentValueXrd: string;
  pnl: string;
  pnlPercentage: string;
  provider: string;
  closeManifest: string;
  strategy?: boolean;
  loanAmount?: string;
  loanCurrency?: string;
  borrowAmount?: string;
  borrowCurrency?: string;
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
