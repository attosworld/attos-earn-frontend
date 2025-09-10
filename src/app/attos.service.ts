import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

export interface AttosStats {
  strategies: number;
  lpDeposited: number;
}

@Injectable({
  providedIn: 'root',
})
export class AttosService {
  http = inject(HttpClient);

  getStats(): Observable<AttosStats> {
    return this.http.get<AttosStats>(`${environment.apiUrl}/stats/users`);
  }
}
