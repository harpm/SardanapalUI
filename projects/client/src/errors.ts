import { Subject, type Observable } from 'rxjs';

/** Names of the CRUD and panel client methods, without the `$` prefix. */
export type ClientOperation =
  | 'get'
  | 'getAll'
  | 'add'
  | 'getEditable'
  | 'edit'
  | 'delete'
  | 'getDictionary'
  | 'getExcel';

/** Where a request came from. The CRUD and panel clients set it on every request. */
export interface SardanapalErrorContext {
  resource: string;
  operation: ClientOperation;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Copied onto the `SardanapalHttpError` of a failed request. */
    errorContext?: SardanapalErrorContext;
  }
}

/**
 * The one error type for a failed request: a transport failure (`status` 0) or a
 * non-2xx response. `resource` and `operation` are set when the request came from
 * a CRUD or panel client.
 */
export class SardanapalHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly mustChangePassword: boolean;
  resource?: string;
  operation?: ClientOperation;

  constructor(message: string, status: number, body: unknown, mustChangePassword = false) {
    super(message);
    this.name = 'SardanapalHttpError';
    this.status = status;
    this.body = body;
    this.mustChangePassword = mustChangePassword;
  }
}

/**
 * Publishes `SardanapalHttpError`s. A `SardanapalHttpClient` owns one, and several
 * clients can share one to get a single stream. Reporting the same error instance
 * again does nothing, so an error is never published twice.
 */
export class SardanapalErrorChannel {
  readonly error$: Observable<SardanapalHttpError>;

  private readonly subject$ = new Subject<SardanapalHttpError>();
  private readonly reported = new WeakSet<SardanapalHttpError>();

  constructor() {
    this.error$ = this.subject$.asObservable();
  }

  /** Publishes the error once and returns the same instance. */
  report(error: SardanapalHttpError): SardanapalHttpError {
    if (!this.reported.has(error)) {
      this.reported.add(error);
      this.subject$.next(error);
    }
    return error;
  }
}
