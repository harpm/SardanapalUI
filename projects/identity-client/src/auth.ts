import {
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  Response,
  SardanapalHttpClient,
  SardanapalHttpError,
  memoryStorage,
  type IResponse,
  type KeyValueStorage,
} from '@sardanapal/client';
import {
  BehaviorSubject,
  defer,
  finalize,
  firstValueFrom,
  from,
  map,
  share,
  throwError,
  type Observable,
} from 'rxjs';
import { SardanapalJwtService, type AuthClaims } from './jwt';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
    skipRefresh?: boolean;
  }
}

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
  /** Required unless `client` is supplied. */
  apiBaseUrl?: string;
  /**
   * Share an existing HTTP client, so Core CRUD/panel calls made through it
   * carry the same `AUTH` header. Omit to create a private one.
   */
  client?: SardanapalHttpClient;
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
  /** Only used when no `client` is supplied. */
  adapter?: AxiosAdapter;
}

const defaultEndpoints: EndpointMap = {
  login: 'account/login',
  refresh: 'account/refresh',
};

export class SardanapalAuthService {
  private static readonly AUTH_HEADER_NAME = 'AUTH';
  private static readonly PASSWORD_CHANGE_MESSAGE = 'Password change required.';
  private static readonly TOKEN_STORAGE_KEY = 'sardanapal.auth.token';

  private readonly jwt = new SardanapalJwtService();

  readonly session$: Observable<Session>;
  readonly httpError$: Observable<SardanapalHttpError>;
  private readonly client: SardanapalHttpClient;
  private readonly endpoints: EndpointMap;
  private readonly storage: KeyValueStorage;
  private readonly refreshThresholdMinutes: number;
  private readonly refreshUrlOption: boolean | string | undefined;
  private readonly sessionSubject$: BehaviorSubject<Session>;
  private passwordChangeRequired = false;
  private refreshInFlight$: Observable<IResponse<string>> | null = null;
  private publishedKey = '';

  constructor(options: SardanapalAuthServiceOptions) {
    this.client = options.client ?? new SardanapalHttpClient({
      apiBaseUrl: options.apiBaseUrl ?? '',
      adapter: options.adapter,
    });
    this.httpError$ = this.client.httpError$;
    this.endpoints = { ...defaultEndpoints, ...options.endpoints };
    this.storage = options.tokenStorage ?? memoryStorage();
    this.refreshThresholdMinutes = options.refreshThresholdMinutes ?? 10;
    this.refreshUrlOption = options.refreshUrl;

    const initial = this.getSession();
    this.publishedKey = this.sessionKey(initial);
    this.sessionSubject$ = new BehaviorSubject(initial);
    this.session$ = this.sessionSubject$.asObservable();

    this.client.use({
      request: (config) => this.beforeRequest(config),
      response: (response) => this.afterResponse(response),
    });
  }

  $login(username: string, password: string): Observable<IResponse<LoginData>> {
    return defer(() => from(this.client.http.post(
      this.endpoints.login,
      { username, password },
      { skipAuth: true, skipRefresh: true },
    ))).pipe(
      map(({ data }) => {
        const result = Response.from<LoginData>(data);
        if (result.isSuccess && result.data?.token) {
          this.storeToken(result.data.token);
        }
        return result;
      }),
    );
  }

  $refresh(): Observable<IResponse<string>> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.performRefresh().pipe(
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        share({
          resetOnError: true,
          resetOnComplete: true,
          resetOnRefCountZero: false,
        }),
      );
    }
    return this.refreshInFlight$;
  }

  $request<T = unknown>(path: string, config?: AxiosRequestConfig): Observable<T> {
    return this.client.$request<T>(path, config);
  }

  logout(): void {
    this.clearToken();
  }

  getSession(): Session {
    const token = this.readToken();
    const claims = token ? this.jwt.decode(token) : null;
    return {
      token,
      claims,
      mustChangePassword: this.passwordChangeRequired || (claims?.mustChangePassword ?? false),
    };
  }

  private async beforeRequest(config: InternalAxiosRequestConfig): Promise<void> {
    if (!config.skipRefresh && this.shouldRefresh(this.getSession().claims)) {
      await firstValueFrom(this.$refresh());
    }

    config.headers.delete('Authorization');
    if (!config.skipAuth) {
      const token = this.readToken();
      if (token) {
        config.headers.set(SardanapalAuthService.AUTH_HEADER_NAME, token);
      }
    }
  }

  private afterResponse(response: AxiosResponse): void {
    const status = response.status;
    if (status !== 401) {
      const refreshed = this.getAuthToken(response);
      if (refreshed) {
        this.storeToken(refreshed);
      }
    }

    if (status === 401) {
      this.clearToken();
      throw new SardanapalHttpError('Unauthorized', 401, response.data);
    }

    if (status === 403 && this.isPasswordChangeBody(response.data)) {
      this.passwordChangeRequired = true;
      this.publish();
      throw new SardanapalHttpError(SardanapalAuthService.PASSWORD_CHANGE_MESSAGE, 403, response.data, true);
    }
  }

  private performRefresh(): Observable<IResponse<string>> {
    return defer(() => {
      const url = this.configuredRefreshUrl();
      if (!url) {
        return throwError(() => new Error('Refresh URL is not configured.'));
      }

      const userId = this.getSession().claims?.id;
      if (!userId) {
        return throwError(() => new Error('Cannot refresh without a user id.'));
      }

      return from(this.client.http.post(url, { userId }, { skipRefresh: true })).pipe(
        map(({ data }) => {
          const envelope = Response.from<string>(data);
          if (envelope.isSuccess && typeof envelope.data === 'string' && envelope.data) {
            this.storeToken(envelope.data);
          }
          return envelope;
        }),
      );
    });
  }

  private configuredRefreshUrl(): string | null {
    if (this.refreshUrlOption === true) {
      return this.client.resolveUrl(this.endpoints.refresh);
    }
    if (typeof this.refreshUrlOption === 'string' && this.refreshUrlOption.trim()) {
      return this.client.resolveUrl(this.refreshUrlOption.trim());
    }
    return null;
  }

  private readToken(): string | null {
    const token = this.storage.get(SardanapalAuthService.TOKEN_STORAGE_KEY);
    return token && token.trim() ? token : null;
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

  private storeToken(token: string): void {
    this.storage.set(SardanapalAuthService.TOKEN_STORAGE_KEY, token);
    const claims = this.jwt.decode(token);
    this.passwordChangeRequired = claims?.mustChangePassword ?? false;
    this.publish();
  }

  private clearToken(): void {
    this.storage.remove(SardanapalAuthService.TOKEN_STORAGE_KEY);
    this.passwordChangeRequired = false;
    this.publish();
  }

  private shouldRefresh(claims: AuthClaims | null): boolean {
    if (this.refreshThresholdMinutes <= 0 || !this.configuredRefreshUrl() || claims?.exp == null) {
      return false;
    }
    const remainingMs = claims.exp * 1000 - Date.now();
    return remainingMs <= this.refreshThresholdMinutes * 60 * 1000;
  }

  private getAuthToken(response: AxiosResponse): string | null {
    const value = AxiosHeaders.from(response.headers as AxiosHeaders).get(SardanapalAuthService.AUTH_HEADER_NAME);
    return typeof value === 'string' ? value : null;
  }

  private isPasswordChangeBody(body: unknown): boolean {
    if (!body || typeof body !== 'object') {
      return false;
    }
    return (body as { message?: unknown }).message === SardanapalAuthService.PASSWORD_CHANGE_MESSAGE;
  }
}
