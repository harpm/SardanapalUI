import {
  Response,
  SardanapalHttpClient,
  SardanapalHttpError,
  type IResponse,
  type KeyValueStorage,
  type SardanapalRequestOptions,
} from '@harpm/sardanapal-client';
import { AxiosHeaders, type AxiosResponse } from 'axios';
import {
  BehaviorSubject,
  defer,
  finalize,
  map,
  share,
  throwError,
  type Observable,
} from 'rxjs';
import { SardanapalJwtService, type AuthClaims } from '../jwt/sardanapal-jwt-service';
import { SardanapalAuthInterceptor } from './sardanapal-auth-interceptor';
import { SardanapalTokenStore } from './sardanapal-token-store';

export interface LoginData {
  token: string;
}

export interface Session {
  token: string | null;
  claims: AuthClaims | null;
  mustChangePassword: boolean;
}

export interface EndpointMap {
  login: string;
  refresh: string;
}

export interface SardanapalAuthServiceOptions {
  /** The shared HTTP client. The auth service registers its interceptor on it. */
  client: SardanapalHttpClient;
  endpoints?: Partial<EndpointMap>;
  /**
   * Minutes before `exp` when a configured refresh URL is called.
   * `0` or less disables proactive refresh. The host sliding refresh
   * (`AUTH` response header) still applies. Hosts must send
   * `Access-Control-Expose-Headers: AUTH` or the browser hides that header.
   */
  refreshThresholdMinutes?: number;
  /** `true` uses the default refresh path. A string overrides that path. Omit to rely on the `AUTH` response header only. */
  refreshUrl?: boolean | string;
  tokenStorage?: KeyValueStorage;
  /**
   * When set, `setRememberMe(true)` writes the token here (typically
   * `localStorage`) and `read()` prefers it over `tokenStorage`.
   */
  persistentTokenStorage?: KeyValueStorage;
}

const defaultEndpoints: EndpointMap = {
  login: 'account/login',
  refresh: 'account/refresh',
};

/**
 * Owns authentication: login, refresh, the token cache, the session and the
 * password-change state. The HTTP transport stays on the shared
 * `SardanapalHttpClient`. The constructor registers a `SardanapalAuthInterceptor`
 * on that client, which calls back into this service for every decision.
 */
export class SardanapalAuthService {
  /** Options for a call that sends no token and skips the refresh. Pass as the last argument of a typed HTTP call. */
  static readonly anonymous: SardanapalRequestOptions = Object.freeze({ skipAuth: true, skipRefresh: true });

  private static readonly PASSWORD_CHANGE_MESSAGE = 'Password change required.';
  private static readonly REFRESH_THRESHOLD_MINUTES = 10;

  readonly session$: Observable<Session>;

  private readonly client: SardanapalHttpClient;
  private readonly endpoints: EndpointMap;
  private readonly store: SardanapalTokenStore;
  private readonly jwt = new SardanapalJwtService();
  private readonly refreshUrl: string | null;
  private readonly refreshThresholdMinutes: number;
  private readonly sessionSubject$: BehaviorSubject<Session>;
  private refreshInFlight$: Observable<IResponse<string>> | null = null;
  private passwordChangeRequired = false;
  private publishedKey = '';

  constructor(options: SardanapalAuthServiceOptions) {
    if (!options?.client) {
      throw new Error('client is required.');
    }

    this.client = options.client;
    this.endpoints = { ...defaultEndpoints, ...options.endpoints };
    this.store = new SardanapalTokenStore(options.tokenStorage, options.persistentTokenStorage);
    this.refreshUrl = this.resolveRefreshUrl(options.refreshUrl);
    this.refreshThresholdMinutes = options.refreshThresholdMinutes ?? SardanapalAuthService.REFRESH_THRESHOLD_MINUTES;

    const initial = this.getSession();
    this.publishedKey = this.sessionKey(initial);
    this.sessionSubject$ = new BehaviorSubject(initial);
    this.session$ = this.sessionSubject$.asObservable();

    this.client.use(new SardanapalAuthInterceptor(this));
  }

  $login(username: string, password: string): Observable<IResponse<LoginData>> {
    return this.client.$post<unknown>(this.endpoints.login, {
      body: { username, password },
      ...SardanapalAuthService.anonymous,
    }).pipe(
      map((data) => {
        const result = Response.from<LoginData>(data);
        if (result.isSuccess && result.data?.token) {
          this.storeToken(result.data.token);
        }
        return result;
      }),
    );
  }

  /**
   * Stores a token obtained outside `$login`, for example from an OTP login.
   * The session stream and the `AUTH` header pick it up like a normal login.
   */
  setToken(token: string): void {
    if (!token?.trim()) {
      throw new Error('token is required.');
    }
    this.storeToken(token);
  }

  /** Runs one refresh at a time. Parallel callers share the in-flight call. */
  $refresh(): Observable<IResponse<string>> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.performRefresh().pipe(
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        share({ resetOnError: true, resetOnComplete: true, resetOnRefCountZero: false }),
      );
    }
    return this.refreshInFlight$;
  }

  /**
   * Chooses where the next stored token is written. Call this before `$login`
   * or `setToken`. Remembered tokens go to `persistentTokenStorage` when that
   * adapter was given; otherwise they stay in `tokenStorage`.
   */
  setRememberMe(remember: boolean): void {
    this.store.setRememberMe(remember);
  }

  logout(): void {
    this.store.clear();
    this.passwordChangeRequired = false;
    this.publish();
  }

  getSession(): Session {
    const token = this.store.read();
    const claims = token ? this.jwt.decode(token) : null;
    return {
      token,
      claims,
      mustChangePassword: this.passwordChangeRequired || (claims?.mustChangePassword ?? false),
    };
  }

  /** Called by the interceptor: the cached token to attach as `AUTH`, or `null`. */
  currentToken(): string | null {
    return this.store.read();
  }

  /** Called by the interceptor before each request: true when a refresh should run first. */
  shouldRefresh(): boolean {
    const claims = this.getSession().claims;
    if (this.refreshThresholdMinutes <= 0 || !this.refreshUrl || claims?.exp == null) {
      return false;
    }
    const remainingMs = claims.exp * 1000 - Date.now();
    return remainingMs <= this.refreshThresholdMinutes * 60 * 1000;
  }

  /**
   * Called by the interceptor for every response. Applies a sliding `AUTH` header,
   * clears the token on 401, and flags the password-change 403. It throws the
   * matching `SardanapalHttpError`, which the HTTP client then reports.
   */
  handleResponse(response: AxiosResponse): void {
    if (response.status !== 401) {
      const refreshed = this.authHeader(response);
      if (refreshed) {
        this.storeToken(refreshed);
      }
    }

    if (response.status === 401) {
      this.logout();
      throw new SardanapalHttpError('Unauthorized', 401, response.data);
    }

    if (response.status === 403 && this.isPasswordChangeBody(response.data)) {
      this.passwordChangeRequired = true;
      this.publish();
      throw new SardanapalHttpError(SardanapalAuthService.PASSWORD_CHANGE_MESSAGE, 403, response.data, true);
    }
  }

  private performRefresh(): Observable<IResponse<string>> {
    return defer(() => {
      if (!this.refreshUrl) {
        return throwError(() => new Error('Refresh URL is not configured.'));
      }

      const userId = this.getSession().claims?.id;
      if (!userId) {
        return throwError(() => new Error('Cannot refresh without a user id.'));
      }

      return this.client.$post<unknown>(this.refreshUrl, { body: { userId }, skipRefresh: true }).pipe(
        map((data) => {
          const envelope = Response.from<string>(data);
          if (envelope.isSuccess && typeof envelope.data === 'string' && envelope.data) {
            this.storeToken(envelope.data);
          }
          return envelope;
        }),
      );
    });
  }

  private storeToken(token: string): void {
    this.store.write(token);
    this.passwordChangeRequired = this.jwt.decode(token)?.mustChangePassword ?? false;
    this.publish();
  }

  private publish(): void {
    const session = this.getSession();
    const key = this.sessionKey(session);
    if (key === this.publishedKey) {
      return;
    }
    this.publishedKey = key;
    this.sessionSubject$.next(session);
  }

  private sessionKey(session: Session): string {
    return `${session.token ?? ''}|${session.mustChangePassword}`;
  }

  private authHeader(response: AxiosResponse): string | null {
    const value = AxiosHeaders.from(response.headers as AxiosHeaders).get(SardanapalAuthInterceptor.AUTH_HEADER_NAME);
    return typeof value === 'string' ? value : null;
  }

  private isPasswordChangeBody(body: unknown): boolean {
    if (!body || typeof body !== 'object') {
      return false;
    }
    return (body as { message?: unknown }).message === SardanapalAuthService.PASSWORD_CHANGE_MESSAGE;
  }

  private resolveRefreshUrl(option: boolean | string | undefined): string | null {
    if (option === true) {
      return this.client.resolveUrl(this.endpoints.refresh);
    }
    if (typeof option === 'string' && option.trim()) {
      return this.client.resolveUrl(option.trim());
    }
    return null;
  }
}
