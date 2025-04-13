import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import Decimal from 'decimal.js';

export interface TokenAmount {
  token: string;
  xrd: string;
  usd: string;
}

export interface AddLiquidityPreview {
  x_amount: TokenAmount;
  y_amount: TokenAmount;
  liquidity_amount: string;
}

@Injectable({
  providedIn: 'root',
})
export class OciswapService {
  private apiUrl = 'https://api.ociswap.com/preview/add-liquidity';

  constructor(private http: HttpClient) {}

  getOciswapAddLiquidityPreview(
    poolAddress: string,
    xAmount?: string,
    yAmount?: string,
    leftBound?: string | null,
    rightBound?: string | null
  ): Observable<AddLiquidityPreview | null> {
    let params = new HttpParams().set('pool_address', poolAddress);

    if (xAmount) params = params.set('x_amount', xAmount);
    if (yAmount) params = params.set('y_amount', yAmount);
    if (leftBound) params = params.set('left_bound', leftBound);
    if (rightBound) params = params.set('right_bound', rightBound);

    return this.http
      .get<AddLiquidityPreview>(this.apiUrl, {
        params,
        headers: { accept: 'application/json' },
      })
      .pipe(
        map(response => response),
        catchError(() => {
          return [null];
        })
      );
  }

  calculateTickBounds(
    currentPrice: number | string | Decimal,
    lowerPricePercentage: number,
    upperPricePercentage: number,
    tickSpacing: number
  ): {
    lowerTick: Decimal;
    upperTick: Decimal;
    lowerPrice: Decimal;
    upperPrice: Decimal;
  } {
    const { lowerPrice, upperPrice } = this.calculatePriceBounds(
      currentPrice,
      lowerPricePercentage,
      upperPricePercentage
    );

    const lowerTick = this.priceToTick(lowerPrice);
    const upperTick = this.priceToTick(upperPrice);

    // Align to tick spacing
    const alignedLowerTick = this.alignTickToSpacing(lowerTick, tickSpacing);
    const alignedUpperTick = this.alignTickToSpacing(upperTick, tickSpacing);

    return {
      lowerTick: alignedLowerTick,
      upperTick: alignedUpperTick,
      lowerPrice: this.tickToPrice(alignedLowerTick),
      upperPrice: this.tickToPrice(alignedUpperTick),
    };
  }

  calculatePriceBounds(
    currentPrice: number | string | Decimal,
    lowerPricePercentage: number,
    upperPricePercentage: number
  ): { lowerPrice: Decimal; upperPrice: Decimal } {
    const decimalPrice = new Decimal(currentPrice);
    const lowerPrice = decimalPrice.mul(
      new Decimal(1).plus(new Decimal(lowerPricePercentage).div(100))
    );
    const upperPrice = decimalPrice.mul(
      new Decimal(1).plus(new Decimal(upperPricePercentage).div(100))
    );
    return { lowerPrice, upperPrice };
  }

  priceToTick(price: number | string | Decimal): number {
    const decimalPrice = new Decimal(price);
    const logBase = new Decimal(1.0001);
    const result = decimalPrice.ln().div(logBase.ln()).floor();
    return result.toNumber();
  }

  tickToPrice(tick: Decimal): Decimal {
    const decimalTick = new Decimal(tick);
    const base = new Decimal(1.0001);
    return base.pow(decimalTick);
  }

  alignTickToSpacing(tick: number, tickSpacing: number): Decimal {
    return new Decimal(
      new Decimal(tick).div(tickSpacing).times(tickSpacing)
    ).floor();
  }
}
