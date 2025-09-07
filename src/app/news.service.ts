import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface TokenNews {
  id: number;
  text: string;
  date: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  http = inject(HttpClient);

  getNews(token: string): Observable<TokenNews[]> {
    const params = new HttpParams().set('token', token);

    return this.http.get<TokenNews[]>(`${environment.apiUrl}/news`, { params });
  }
}
