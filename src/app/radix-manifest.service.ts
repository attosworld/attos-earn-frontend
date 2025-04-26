import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RadixManifestService {
  createOciswapAddLiquidityManifest({
    account,
    poolAddress,
    xAddress,
    yAddress,
    xAmount,
    yAmount,
    leftBound,
    rightBound,
  }: {
    account: string;
    poolAddress: string;
    xAmount: string;
    yAmount: string;
    xAddress: string;
    yAddress: string;
    leftBound?: string | null;
    rightBound?: string | null;
  }): string {
    return `
CALL_METHOD
Address("component_rdx1cqjzzku4rrkz3zhm8hldn55evpgmxx9rpq9t98qtnj0asdg88f9yj6")
"track_lp"
;
CALL_METHOD
  Address("${account}")
  "withdraw"
  Address("${xAddress}")
  Decimal("${xAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${xAddress}")
  Bucket("x")
;
CALL_METHOD
  Address("${account}")
  "withdraw"
  Address("${yAddress}")
  Decimal("${yAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${yAddress}")
  Bucket("y")
;
CALL_METHOD
    Address("${poolAddress}")
    "add_liquidity"
    ${leftBound ? `${leftBound}i32` : ''}
    ${rightBound ? `${rightBound}i32` : ''}
    Bucket("x")
    Bucket("y")
;
CALL_METHOD
    Address("${account}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;`;
  }

  createDefiplazaAddLiquidityManifest({
    account,
    poolAddress,
    xAddress,
    yAddress,
    xAmount,
    yAmount,
  }: {
    account: string;
    poolAddress: string;
    xAmount: string;
    yAmount: string;
    xAddress: string;
    yAddress: string;
  }): string {
    return `
CALL_METHOD
Address("component_rdx1cqjzzku4rrkz3zhm8hldn55evpgmxx9rpq9t98qtnj0asdg88f9yj6")
"track_lp"
;
CALL_METHOD
  Address("${account}")
  "withdraw"
  Address("${xAddress}")
  Decimal("${xAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${xAddress}")
  Bucket("x")
;
CALL_METHOD
  Address("${account}")
  "withdraw"
  Address("${yAddress}")
  Decimal("${yAmount}")
;

TAKE_ALL_FROM_WORKTOP
  Address("${yAddress}")
  Bucket("y")
;
CALL_METHOD
    Address("${poolAddress}")
    "add_liquidity"
    Bucket("x")
    Enum<1u8>(Bucket("y"))
;
CALL_METHOD
    Address("${account}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;`;
  }

  createDefiplazaSingleAddLiquidityManifest({
    account,
    poolAddress,
    address,
    amount,
  }: {
    account: string;
    poolAddress: string;
    amount: string;
    address: string;
  }): string {
    return `
CALL_METHOD
Address("component_rdx1cqjzzku4rrkz3zhm8hldn55evpgmxx9rpq9t98qtnj0asdg88f9yj6")
"track_lp"
;
CALL_METHOD
  Address("${account}")
  "withdraw"
  Address("${address}")
  Decimal("${amount}")
;
TAKE_ALL_FROM_WORKTOP
  Address("${address}")
  Bucket("x")
;
CALL_METHOD
    Address("${poolAddress}")
    "add_liquidity"
    Bucket("x")
    Enum<0u8>()
;
CALL_METHOD
    Address("${account}")
    "deposit_batch"
    Expression("ENTIRE_WORKTOP")
;`;
  }
}
