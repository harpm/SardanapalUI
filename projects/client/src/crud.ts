import { catchError, Subject, throwError, type Observable } from "rxjs";
import type { AxiosRequestConfig } from "axios";
import type { SardanapalHttpClient } from "./http";
import {
  createGridSearchModel,
  type EntityKey,
  type GridResult,
  type GridSearchModel,
} from "./grid";
import type { IResponse } from "./response";

/** Names of the client methods, without the `$` prefix. */
export type ClientOperation =
  | "get"
  | "getAll"
  | "add"
  | "getEditable"
  | "edit"
  | "delete"
  | "getDictionary"
  | "getExcel";

/** What `error$` emits for a failed request: a transport failure or a non-2xx status. */
export interface SardanapalClientError {
  resource: string;
  operation: ClientOperation;
  message: string;
  /** Normally a `SardanapalHttpError`. */
  error: Error;
}

/**
 * Path templates, one per CRUD method. Placeholders:
 * - `{resource}` is replaced with the client `resource`.
 * - `{id}` is replaced with the URL-encoded key.
 *
 * The HTTP verb for each method is fixed: get `GET`, getAll `POST`, add `POST`,
 * getEditable `GET`, edit `PUT`, delete `DELETE`.
 */
export interface CrudEndpointMap {
  get: string;
  getAll: string;
  add: string;
  getEditable: string;
  edit: string;
  delete: string;
}

export const defaultCrudEndpoints: CrudEndpointMap = {
  get: "{resource}/{id}",
  getAll: "{resource}/get-all",
  add: "{resource}/add",
  getEditable: "{resource}/get-editable/{id}",
  edit: "{resource}/{id}",
  delete: "{resource}/{id}",
};

export interface SardanapalCrudClientOptions<
  TEndpoints extends CrudEndpointMap = CrudEndpointMap,
> {
  /**
   * Share the HTTP client used by the rest of the app, so these calls carry
   * the `AUTH` header added by `SardanapalAuthService`.
   */
  client: SardanapalHttpClient;
  /** Resource segment of the host route, for example `orders` or `sales/orders`. */
  resource: string;
  /** Overrides applied on top of the default endpoint map for this resource. */
  endpoints?: Partial<TEndpoints>;
}

/**
 * Calls the host that exposes a Core `CrudServiceBase`. axios deserializes the
 * body, and each method is typed as `IResponse<T>`. The body is returned as
 * received, so check `isSuccess` and show `userMessage` yourself. Transport
 * failures and non-2xx statuses reject with `SardanapalHttpError`.
 *
 * Those rejections are also emitted on `error$` with the resource and operation.
 * `error$` only sees this client's calls. Use `SardanapalHttpClient.httpError$`
 * for every call made on the shared client.
 */
export class SardanapalCrudClient<
  TKey extends EntityKey = number,
  TSearch = unknown,
  TVM = unknown,
  TNew = unknown,
  TEditable = unknown,
  TItem = TVM,
> {
  protected readonly client: SardanapalHttpClient;
  readonly resource: string;
  /** Emits once for each failed request of this client. */
  readonly error$: Observable<SardanapalClientError>;
  private readonly errorSubject$ = new Subject<SardanapalClientError>();
  /** Defaults merged with the `endpoints` option. A subclass redeclares this with its wider map type. */
  protected readonly endpoints: CrudEndpointMap;

  /**
   * @param defaults Endpoint map the `endpoints` option is applied on top of.
   *   Subclasses pass their own wider map. Callers normally omit it.
   */
  constructor(
    options: SardanapalCrudClientOptions,
    defaults: CrudEndpointMap = defaultCrudEndpoints,
  ) {
    if (!options.client) {
      throw new Error("client is required.");
    }
    const resource = options.resource?.trim().replace(/^\/+|\/+$/g, "");
    if (!resource) {
      throw new Error("resource is required.");
    }

    this.client = options.client;
    this.resource = resource;
    this.error$ = this.errorSubject$.asObservable();
    this.endpoints = this.mergeEndpoints(defaults, options.endpoints);
  }

  $get(id: TKey): Observable<IResponse<TVM>> {
    return this.$send<TVM>("get", this.buildPath(this.endpoints.get, id), {
      method: "GET",
    });
  }

  $getAll(
    model?: Partial<GridSearchModel<TKey, TSearch>> | null,
  ): Observable<IResponse<GridResult<TItem, TKey>>> {
    return this.$send<GridResult<TItem, TKey>>(
      "getAll",
      this.buildPath(this.endpoints.getAll),
      { method: "POST", data: createGridSearchModel(model) },
    );
  }

  $add(model: TNew): Observable<IResponse<TKey>> {
    return this.$send<TKey>("add", this.buildPath(this.endpoints.add), {
      method: "POST",
      data: model,
    });
  }

  $getEditable(id: TKey): Observable<IResponse<TEditable>> {
    return this.$send<TEditable>(
      "getEditable",
      this.buildPath(this.endpoints.getEditable, id),
      { method: "GET" },
    );
  }

  $edit(id: TKey, model: TEditable): Observable<IResponse<boolean>> {
    return this.$send<boolean>(
      "edit",
      this.buildPath(this.endpoints.edit, id),
      { method: "PUT", data: model },
    );
  }

  $delete(id: TKey): Observable<IResponse<boolean>> {
    return this.$send<boolean>(
      "delete",
      this.buildPath(this.endpoints.delete, id),
      { method: "DELETE" },
    );
  }

  /**
   * Fills `{resource}` and `{id}` in a template. The id is URL-encoded, the
   * resource is not (it may contain `/`). Repeated slashes collapse, but the
   * `//` of an absolute URL is kept.
   */
  protected buildPath(template: string, id?: TKey): string {
    let path = template.replace(/\{resource\}/g, this.resource);

    if (path.includes("{id}")) {
      if (id === undefined || id === null || id === "") {
        throw new Error("id is required.");
      }
      path = path.replace(/\{id\}/g, encodeURIComponent(String(id)));
    }

    return path.replace(/(^|[^:])\/{2,}/g, "$1/");
  }

  /** Sends the request and types the deserialized body as `IResponse<T>`. A failure is reported on `error$` and rethrown. */
  protected $send<T>(
    operation: ClientOperation,
    path: string,
    config: AxiosRequestConfig,
  ): Observable<IResponse<T>> {
    return this.client.$request<IResponse<T>>(path, config).pipe(
      catchError((error: unknown) => {
        this.reportFailure(operation, error);
        return throwError(() => error);
      }),
    );
  }

  /** Emits a failed request on `error$`. Subclasses call it for requests that do not use `$send`. */
  protected reportFailure(operation: ClientOperation, error: unknown): void {
    const failure = error instanceof Error ? error : new Error(String(error));
    this.errorSubject$.next({
      resource: this.resource,
      operation,
      message: failure.message,
      error: failure,
    });
  }

  /** Applies overrides on top of defaults, ignoring `undefined` and blank values. */
  private mergeEndpoints(
    defaults: CrudEndpointMap,
    overrides?: Partial<CrudEndpointMap> | null,
  ): CrudEndpointMap {
    const merged = { ...defaults } as unknown as Record<string, unknown>;
    if (overrides) {
      for (const [name, value] of Object.entries(overrides)) {
        if (typeof value === "string" && value.trim()) {
          merged[name] = value.trim();
        }
      }
    }
    return merged as unknown as CrudEndpointMap;
  }
}
