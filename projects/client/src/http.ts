import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { defer, from, map, Subject, type Observable } from 'rxjs';

export class SardanapalHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly mustChangePassword: boolean;

  constructor(message: string, status: number, body: unknown, mustChangePassword = false) {
    super(message);
    this.name = 'SardanapalHttpError';
    this.status = status;
    this.body = body;
    this.mustChangePassword = mustChangePassword;
  }
}

/**
 * Hook into every request and response of a `SardanapalHttpClient`.
 * Identity uses it to attach the `AUTH` header and to react to 401/403.
 */
export interface SardanapalHttpInterceptor {
  /** Runs before the request is sent. May be async and may mutate `config`. */
  request?(config: InternalAxiosRequestConfig): void | Promise<void>;
  /**
   * Runs for every response, including non-2xx ones, before the generic
   * status check. Throw a `SardanapalHttpError` (through `reportHttpError`)
   * to reject the call.
   */
  response?(response: AxiosResponse): void;
}

export interface SardanapalHttpClientOptions {
  apiBaseUrl: string;
  adapter?: AxiosAdapter;
}

export class SardanapalHttpClient {
  readonly apiBaseUrl: string;
  readonly http: AxiosInstance;
  readonly httpError$: Observable<SardanapalHttpError>;

  private readonly httpErrorSubject = new Subject<SardanapalHttpError>();
  private readonly interceptors: SardanapalHttpInterceptor[] = [];

  constructor(options: SardanapalHttpClientOptions) {
    if (!options.apiBaseUrl?.trim()) {
      throw new Error('apiBaseUrl is required.');
    }

    this.apiBaseUrl = options.apiBaseUrl;
    this.httpError$ = this.httpErrorSubject.asObservable();
    this.http = axios.create({
      baseURL: this.apiBaseUrl,
      adapter: options.adapter,
      validateStatus: () => true,
    });

    this.http.interceptors.request.use(async (config) => {
      for (const interceptor of this.interceptors) {
        await interceptor.request?.(config);
      }
      return config;
    });

    this.http.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error: AxiosError) => {
        if (error instanceof SardanapalHttpError) {
          return Promise.reject(error);
        }
        return Promise.reject(this.reportHttpError(new SardanapalHttpError(
          error.message || 'Request failed',
          error.response?.status ?? 0,
          error.response?.data,
        )));
      },
    );
  }

  /** Interceptors run in the order they were added. */
  use(interceptor: SardanapalHttpInterceptor): void {
    this.interceptors.push(interceptor);
  }

  $request<T = unknown>(path: string, config?: AxiosRequestConfig): Observable<T> {
    return defer(() => from(this.http.request<T>({ ...config, url: path }))).pipe(
      map((response) => response.data),
    );
  }

  resolveUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    const base = this.apiBaseUrl.replace(/\/+$/, '');
    const path = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  reportHttpError(error: SardanapalHttpError): SardanapalHttpError {
    this.httpErrorSubject.next(error);
    return error;
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    for (const interceptor of this.interceptors) {
      interceptor.response?.(response);
    }

    if (response.status < 200 || response.status >= 300) {
      throw this.reportHttpError(new SardanapalHttpError(
        response.statusText || 'Request failed',
        response.status,
        response.data,
      ));
    }

    return response;
  }
}
