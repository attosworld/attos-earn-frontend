import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WalletGuard implements CanActivate {
  canActivate(): Observable<boolean> {
    return of(true);
  }
}
