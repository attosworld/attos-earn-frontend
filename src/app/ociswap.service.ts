import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import Decimal from 'decimal.js';
import { decode } from 'bech32-buffer';

Decimal.set({ precision: 50 });

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

export interface Swap {
  input_address: string;
  input_amount: TokenAmount;
  input_take: string;
  output_address: string;
  output_amount: TokenAmount;
  input_fee_lp: TokenAmount;
  input_fee_settlement: TokenAmount;
  price_impact: string;
  pool_address: string;
  protocol: string;
}

export interface SwapPreview {
  input_address: string;
  input_amount: TokenAmount;
  output_address: string;
  output_amount: TokenAmount;
  input_fee_lp: TokenAmount;
  input_fee_settlement: TokenAmount;
  price_impact: string;
  swaps: Swap[];
}

export interface TimeFrames {
  '1h': string;
  '24h': string;
  '7d': string;
}

export type TimeFramesWithTotal = TimeFrames & {
  total: string;
};

export type TimeFramesWithNow = TimeFrames & {
  now: string;
};

export interface TokenInfo {
  address: string;
  icon_url: string;
  name: string;
  slug: string;
  symbol: string;
}

export interface FeeInfo {
  token: TimeFramesWithTotal;
  usd: TimeFramesWithTotal;
  xrd: TimeFramesWithTotal;
}

export interface LiquidityInfo {
  token: TimeFramesWithNow;
  usd: TimeFramesWithNow;
  xrd: TimeFramesWithNow;
}

export interface PriceInfo {
  token: TimeFramesWithNow;
  usd: TimeFramesWithNow;
  xrd: TimeFramesWithNow;
}

export interface TotalValueLocked {
  token: TimeFramesWithNow;
  usd: TimeFramesWithNow;
  xrd: TimeFramesWithNow;
}

export interface VolumeInfo {
  '1h': string;
  '24h': string;
  '7d': string;
  total: string;
}

export interface TokenData {
  fee: FeeInfo;
  liquidity: LiquidityInfo;
  price: PriceInfo;
  token: TokenInfo;
  total_value_locked: TotalValueLocked;
  volume: VolumeInfo;
}

export interface OciswapPool {
  address: string;
  apr: TimeFrames;
  base_token: string;
  blueprint_name: string;
  created_at: string;
  fee: {
    usd: TimeFramesWithTotal;
    xrd: TimeFramesWithTotal;
  };
  fee_rate: string;
  liquidity: LiquidityInfo;
  lp_token_address: string;
  name: string;
  pool_type: string;
  rank: number;
  slug: string;
  total_value_locked: {
    usd: TimeFramesWithNow;
    xrd: TimeFramesWithNow;
  };
  version: string;
  volume: {
    usd: TimeFramesWithTotal;
    xrd: TimeFramesWithTotal;
  };
  x: TokenData;
  y: TokenData;
}

@Injectable({
  providedIn: 'root',
})
export class OciswapService {
  private apiUrl = 'https://api.ociswap.com/preview/add-liquidity';
  private swapPreviewUrl = 'https://api.ociswap.com/preview/swap';

  constructor(private http: HttpClient) {}

  XRD = 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';

  getPrecisionPrice(
    poolAddress: string
  ): Observable<{ precisionPrice: number; currentPrice: number } | null> {
    return this.http
      .get<OciswapPool>(`https://api.ociswap.com/pools/${poolAddress}`)
      .pipe(
        map(pool => {
          const precisionPrice =
            this.bech32ToHex(pool.x.token.address) >
            this.bech32ToHex(pool.y.token.address)
              ? +pool.y.price.xrd.now / +pool.x.price.xrd.now
              : +pool.x.price.xrd.now / +pool.y.price.xrd.now;

          const currentPrice =
            pool.x.token.address === this.XRD
              ? +pool.y.price.xrd.now
              : +pool.x.price.xrd.now;

          return { precisionPrice, currentPrice };
        })
      );
  }

  getOciswapSwapPreview(
    inputAddress: string,
    inputAmount: string,
    outputAddress: string,
    outputAmount: string
  ): Observable<SwapPreview | null> {
    let params = new HttpParams();
    if (inputAddress) params = params.set('input_address', inputAddress);
    if (inputAmount) params = params.set('input_amount', inputAmount);
    if (outputAddress) params = params.set('output_address', outputAddress);
    if (outputAmount) params = params.set('output_amount', outputAmount);

    return this.http.get<SwapPreview>(this.swapPreviewUrl, {
      params,
      headers: { accept: 'application/json' },
    });
  }

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

  alignTickToSpacing(tick: number, tickSpacing: number): Decimal {
    return new Decimal(
      new Decimal(tick).div(tickSpacing).times(tickSpacing)
    ).floor();
  }

  /**
   * Convert price to tick using logarithmic calculation
   */
  priceToTick(price: number): string {
    const logConstant = new Decimal(
      '0.0000999950003333083353331666809511310635'
    );
    return new Decimal(price).log(Math.E).dividedBy(logConstant).toFixed(0);
  }

  /**
   * Calculate price with percentage adjustment
   */
  adjustPriceByPercentage(price: number, percentage: number): number {
    return price * (1 + percentage / 100);
  }

  /**
   * Calculate tick bounds for a price range with percentage adjustments
   */
  calculateTickBounds(
    basePrice: number,
    lowerPercentage: number,
    upperPercentage: number
  ) {
    const lowerPrice = this.adjustPriceByPercentage(basePrice, lowerPercentage);
    const upperPrice = this.adjustPriceByPercentage(basePrice, upperPercentage);

    return {
      lowerTick: this.priceToTick(lowerPrice),
      upperTick: this.priceToTick(upperPrice),
      lowerPrice,
      upperPrice,
    };
  }

  bech32ToHex(address: string) {
    return decode(address).data.reduce((hex, byte) => {
      let hexByte = byte.toString(16);
      return hexByte.length === 1 && (hexByte = '0' + hexByte), hex + hexByte;
    }, '');
  }
}
