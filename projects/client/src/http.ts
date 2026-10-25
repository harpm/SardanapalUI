import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { defer, from, map, type Observable } from 'rxjs';
import { SardanapalErrorChannel, SardanapalHttpError } from './errors';

/**
 * Hook into every request and response of a `SardanapalHttpClient`.
 * Identity uses it to attach the `AUTH` header and to react to 401/403.
 */
export interface SardanapalHttpInterceptor {
  /** Runs before the request is sent. May be async and may mutate `config`. */
  request?(config: InternalAxiosRequestConfig): void | Promise<void>;
  /**
   * Runs for every response, including non-2xx ones, before the generic
   * status check. Throw a `SardanapalHttpError` to reject the call. The client
   * reports it, so do not report it yourself.
   *
   * A non-2xx body read as `arraybuffer` or `blob` is already decoded to JSON
   * (or text) when this runs.
   */
  response?(response: AxiosResponse): void;
}

export interface SardanapalHttpClientOptions {
  apiBaseUrl: string;
  adapter?: AxiosAdapter;
  /** Share a channel to get the errors of several clients on one stream. Omit to create a private one. */
  errors?: SardanapalErrorChannel;
}

export class SardanapalHttpClient {
  readonly apiBaseUrl: string;
  readonly http: AxiosInstance;
  /** Every failed request is reported here, once, as a `SardanapalHttpError`. */
  readonly errors: SardanapalErrorChannel;
  /** The error stream of `errors`. */
  readonly httpError$: Observable<SardanapalHttpError>;

  private readonly interceptors: SardanapalHttpInterceptor[] = [];

  constructor(options: SardanapalHttpClientOptions) {
    if (!options.apiBaseUrl?.trim()) {
      throw new Error('apiBaseUrl is required.');
    }

    this.apiBaseUrl = options.apiBaseUrl;
    this.errors = options.errors ?? new SardanapalErrorChannel();
    this.httpError$ = this.errors.error$;
    this.http = axios.create({
      baseURL: this.apiBaseUrl,
      adapter: options.adapter,
      validateStatus: () => true,
    });

    this.http.interceptors.request.use(async (config) => {
      try {
        for (const interceptor of this.interceptors) {
          await interceptor.request?.(config);
        }
      } catch (error) {
        const failure = error instanceof SardanapalHttpError
          ? error
          : new SardanapalHttpError(this.errorMessage(error), 0, undefined);
        this.applyContext(failure, config);
        throw failure;
      }
      return config;
    });

    this.http.interceptors.response.use(
      (response) => this.handleResponse(response),
      (error: unknown) => {
        if (error instanceof SardanapalHttpError) {
          return Promise.reject(this.report(error));
        }
        const axiosError = error as Partial<AxiosError>;
        return Promise.reject(this.report(
          new SardanapalHttpError(
            this.errorMessage(error),
            axiosError.response?.status ?? 0,
            axiosError.response?.data,
          ),
          axiosError.config,
        ));
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

  private async handleResponse(response: AxiosResponse): Promise<AxiosResponse> {
    const failed = response.status < 200 || response.status >= 300;

    try {
      if (failed) {
        await this.decodeBinaryBody(response);
      }

      for (const interceptor of this.interceptors) {
        interceptor.response?.(response);
      }

      if (failed) {
        throw new SardanapalHttpError(
          response.statusText || 'Request failed',
          response.status,
          response.data,
        );
      }
    } catch (error) {
      if (error instanceof SardanapalHttpError) {
        throw this.report(error, response.config);
      }
      throw error;
    }

    return response;
  }

  /** Adds the request context, then publishes the error once. */
  private report(error: SardanapalHttpError, config?: AxiosRequestConfig): SardanapalHttpError {
    this.applyContext(error, config);
    return this.errors.report(error);
  }

  private applyContext(error: SardanapalHttpError, config?: AxiosRequestConfig): void {
    const context = config?.errorContext;
    if (context) {
      error.resource ??= context.resource;
      error.operation ??= context.operation;
    }
  }

  private errorMessage(error: unknown): string {
    return (error instanceof Error && error.message) || 'Request failed';
  }

  /**
   * With a binary `responseType` an error body arrives as bytes. Replace it with
   * parsed JSON, or text when it is not JSON, so interceptors and callers can read it.
   */
  private async decodeBinaryBody(response: AxiosResponse): Promise<void> {
    const type = response.config?.responseType;
    if (type !== 'arraybuffer' && type !== 'blob') {
      return;
    }

    const text = await this.readText(response.data);
    if (text === null) {
      return;
    }

    try {
      response.data = JSON.parse(text);
    } catch {
      response.data = text;
    }
  }

  private async readText(body: unknown): Promise<string | null> {
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      return body.text();
    }
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      return new TextDecoder().decode(body);
    }
    return null;
  }
}
