import { inject, Injectable } from '@angular/core';
import { RadixConnectService } from './radix-connect.service';
import s from '@calamari-radix/sbor-ez-mode';
import { from } from 'rxjs';
import Decimal from 'decimal.js';

const poolStateSchema = s.struct({
  state: s.struct({
    shortage: s.enum([
      {
        variant: 'QuoteShortage',
        schema: s.tuple([]),
      },
      {
        variant: 'BaseShortage',
        schema: s.tuple([]),
      },
    ]),
  }),
  base_divisibility: s.number(),
  quote_divisibility: s.number(),
  base_pool: s.address(),
  quote_pool: s.address(),
});

@Injectable({
  providedIn: 'root',
})
export class DefiplazaService {
  private radixConnectService = inject(RadixConnectService);

  getPoolDetails(poolComponent: string) {
    const componentState = from(
      this.radixConnectService.gatewayEz.state
        .getComponentInfo(poolComponent)
        .then(async componentInfo => {
          const state = componentInfo.state
            .getWithSchema(poolStateSchema)
            ._unsafeUnwrap();

          const poolBalances = await Promise.all([
            this.radixConnectService.gatewayEz.state.getComponentFungibleBalances(
              state.base_pool
            ),
            this.radixConnectService.gatewayEz.state.getComponentFungibleBalances(
              state.quote_pool
            ),
          ]);

          let baseRatio = new Decimal(0);
          let quoteRatio = new Decimal(0);

          if (state.state.shortage.variant === 'BaseShortage') {
            baseRatio = new Decimal(poolBalances[0][1].balance).div(
              poolBalances[0][0].balance
            );
            quoteRatio = new Decimal(poolBalances[0][0].balance).div(
              poolBalances[0][1].balance
            );
          } else if (state.state.shortage.variant === 'QuoteShortage') {
            baseRatio = new Decimal(poolBalances[1][1].balance).div(
              poolBalances[1][0].balance
            );
            quoteRatio = new Decimal(poolBalances[1][0].balance).div(
              poolBalances[1][1].balance
            );
          }

          return {
            shortage: state.state.shortage.variant,
            baseDivisibility: state.base_divisibility,
            quoteDivisibility: state.quote_divisibility,
            baseRatio,
            quoteRatio,
          };
        })
    );

    return from(componentState);
  }
}
