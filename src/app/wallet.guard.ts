import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RadixConnectService } from './radix-connect.service';

@Injectable({
  providedIn: 'root',
})
export class WalletGuard implements CanActivate {
  private radixConnectService = inject(RadixConnectService);
  private router = inject(Router);

  canActivate(): Observable<boolean> {
    return this.radixConnectService.getWalletData().pipe(
      map(account => {
        if (account && account.account) {
          this.router.navigate(['/pools']);
          return false;
        }
        return true;
      })
    );
  }
}
