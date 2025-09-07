import {
  Component,
  OnInit,
  inject,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import {
  Subject,
  catchError,
  of,
  Observable,
  BehaviorSubject,
  tap,
  map,
} from 'rxjs';
import { RadixConnectService } from '../radix-connect.service';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
}

interface DiscordAuthResponse {
  access_token?: string;
}

interface ComponentState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  user: DiscordUser | null;
}

@Component({
  selector: 'app-discord-verify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './discord-verify.component.html',
  styleUrls: ['./discord-verify.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DiscordVerifyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private radixConnectService = inject(RadixConnectService);
  private destroy$ = new Subject<void>();

  private stateSubject = new BehaviorSubject<ComponentState>({
    isLoading: false,
    isAuthenticated: false,
    error: null,
    user: null,
  });

  // Public observables for template
  state$ = this.stateSubject.asObservable();
  isLoading$ = this.state$.pipe(map(state => state.isLoading));
  isAuthenticated$ = this.state$.pipe(map(state => state.isAuthenticated));
  error$ = this.state$.pipe(map(state => state.error));
  user$ = this.state$.pipe(map(state => state.user));
  isDiscordTokenAuthenticated$ = of(false);

  // Discord OAuth configuration
  private readonly DISCORD_CLIENT_ID = environment.discordClientId;
  private readonly DISCORD_REDIRECT_URI = `${window.location.origin}/discord-verify`;
  private readonly DISCORD_SCOPE = 'identify email';
  private readonly API_BASE_URL = environment.apiUrl;

  rolaResponse$ = this.radixConnectService.getRolaResponse();

  ngOnInit() {
    const code = this.route.snapshot.queryParams['code'];
    const error = this.route.snapshot.queryParams['error'];

    if (error) {
      this.updateState({
        error: 'Discord authorization was denied or failed',
        isLoading: false,
      });
      return;
    }

    if (code) {
      this.isDiscordTokenAuthenticated$ = this.authenticateWithCode(code).pipe(
        tap(response => {
          if (response.access_token) {
            this.storeToken(response.access_token);
            this.updateState({
              isAuthenticated: true,
              error: null,
              isLoading: false,
            });
          } else {
            this.updateState({
              error: 'Failed to authenticate with Discord. Please try again.',
              isLoading: false,
            });
          }
        }),
        map(() => true),
        catchError(() => of(false))
      );
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initiateDiscordLogin() {
    const discordAuthUrl =
      `https://discord.com/api/oauth2/authorize?` +
      `client_id=${this.DISCORD_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(this.DISCORD_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(this.DISCORD_SCOPE)}`;

    window.location.href = discordAuthUrl;
  }

  logout() {
    this.clearStoredToken();
    this.updateState({
      user: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
    });
  }

  getAccessToken(): string | null {
    return this.getStoredToken();
  }

  private authenticateWithCode(code: string): Observable<DiscordAuthResponse> {
    const payload = {
      code,
    };

    return this.http
      .post<DiscordAuthResponse>(
        `${this.API_BASE_URL}/discord/verify-code`,
        payload
      )
      .pipe(
        catchError(() => {
          return of({
            success: false,
            error: 'Failed to authenticate with Discord. Please try again.',
          } as DiscordAuthResponse);
        }),
        tap(response => {
          if (response.access_token) {
            this.storeToken(response.access_token);
            this.updateState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            this.updateState({
              error: 'Authentication failed',
              isLoading: false,
              isAuthenticated: false,
              user: null,
            });
          }
        })
      );
  }

  private updateState(partialState: Partial<ComponentState>) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...partialState });
  }

  private storeToken(token: string) {
    sessionStorage.setItem('discord_access_token', token);
  }

  private getStoredToken(): string | null {
    const token = sessionStorage.getItem('discord_access_token');

    if (!token) {
      return null;
    }

    return token;
  }

  private clearStoredToken() {
    sessionStorage.removeItem('discord_access_token');
  }
}
