import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, take, tap } from 'rxjs';
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

interface CacheEntry {
  data: PortfolioItem[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private apiUrl = `${environment.apiUrl}/portfolio`;
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

  private lpPositionsSubject = new BehaviorSubject<Map<string, CacheEntry>>(
    new Map()
  );
  private strategyPositionsSubject = new BehaviorSubject<
    Map<string, CacheEntry>
  >(new Map());

  constructor(private http: HttpClient) {}

  refresh() {
    this.lpPositionsSubject.next(new Map());
    this.strategyPositionsSubject.next(new Map());
  }

  getPortfolioItems(
    account: string,
    type: 'lp' | 'strategy' | undefined
  ): Observable<PortfolioItem[]> {
    if (type === 'lp') {
      return this.getLPPositions(account).pipe(take(1));
    } else if (type === 'strategy') {
      return this.getStrategyPositions(account).pipe(take(1));
    }

    return this.http.get<PortfolioItem[]>(
      `${this.apiUrl}?address=${account}&type=${type}`
    );
  }

  getLPPositions(account: string): Observable<PortfolioItem[]> {
    return this.lpPositionsSubject.pipe(
      switchMap(cacheMap => {
        const cached = cacheMap.get(account);

        if (cached && this.isCacheValid(cached.timestamp)) {
          return of(cached.data);
        }

        return this.http
          .get<PortfolioItem[]>(`${this.apiUrl}?address=${account}&type=lp`)
          .pipe(
            tap(data => {
              const currentMap = this.lpPositionsSubject.getValue();
              const newMap = new Map(currentMap);
              newMap.set(account, {
                data,
                timestamp: Date.now(),
              });
              this.lpPositionsSubject.next(newMap);
            })
          );
      })
    );
  }

  getStrategyPositions(account: string): Observable<PortfolioItem[]> {
    return this.strategyPositionsSubject.pipe(
      switchMap(cacheMap => {
        const cached = cacheMap.get(account);

        if (cached && this.isCacheValid(cached.timestamp)) {
          return of(cached.data);
        }

        return this.http
          .get<
            PortfolioItem[]
          >(`${this.apiUrl}?address=${account}&type=strategy`)
          .pipe(
            tap(data => {
              const currentMap = this.strategyPositionsSubject.getValue();
              const newMap = new Map(currentMap);
              newMap.set(account, {
                data,
                timestamp: Date.now(),
              });
              this.strategyPositionsSubject.next(newMap);
            })
          );
      })
    );
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }
}
