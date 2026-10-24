import { catchError, from, switchMap, throwError, type Observable } from 'rxjs';
import {
  SardanapalCrudClient,
  defaultCrudEndpoints,
  type CrudEndpointMap,
  type SardanapalCrudClientOptions,
} from './crud';
import { createGridSearchModel, type EntityKey, type GridResult, type GridSearchModel, type SelectOption } from './grid';
import { SardanapalHttpError } from './http';
import type { IResponse } from './response';

/**
 * CRUD templates plus the two panel methods. Both panel calls are `POST`.
 * Same `{resource}` and `{id}` placeholders as `CrudEndpointMap`.
 */
export interface PanelEndpointMap extends CrudEndpointMap {
  getDictionary: string;
  getExcel: string;
}

export const defaultPanelEndpoints: PanelEndpointMap = {
  ...defaultCrudEndpoints,
  getDictionary: '{resource}/dictionary',
  getExcel: '{resource}/excel',
};

export type SardanapalPanelClientOptions = SardanapalCrudClientOptions<PanelEndpointMap>;

export interface GetExcelOptions {
  /**
   * How axios reads the file. `arraybuffer` (default) works in every runtime.
   * `blob` is browser-only and returns a `Blob`.
   */
  responseType?: 'arraybuffer' | 'blob';
}

/**
 * Calls the host that exposes a Core `PanelServiceBase`: everything in
 * `SardanapalCrudClient`, plus `$getDictionary` and `$getExcel`.
 */
export class SardanapalPanelClient<
  TKey extends EntityKey = number,
  TSearch = unknown,
  TVM = unknown,
  TNew = unknown,
  TEditable = unknown,
  TItem = TVM,
> extends SardanapalCrudClient<TKey, TSearch, TVM, TNew, TEditable, TItem> {
  protected declare readonly endpoints: PanelEndpointMap;

  constructor(options: SardanapalPanelClientOptions) {
    super(options, defaultPanelEndpoints);
  }

  /** Key/value pairs for selects, as a grid. A missing model sends the defaults. */
  $getDictionary(
    model?: Partial<GridSearchModel<TKey, TSearch>> | null,
  ): Observable<IResponse<GridResult<SelectOption<TKey>, TKey>>> {
    return this.$send<GridResult<SelectOption<TKey>, TKey>>(
      'getDictionary',
      this.buildPath(this.endpoints.getDictionary),
      { method: 'POST', data: createGridSearchModel(model) },
    );
  }

  /**
   * Downloads the search result as a file. The response is the file bytes, not
   * the JSON envelope. The request always uses `pageSize: 0` (all rows). A failed
   * call rejects with `SardanapalHttpError` whose `body` is the decoded error
   * body (parsed JSON when possible, otherwise text), not raw bytes. The same
   * decoded error is emitted on `error$`.
   */
  $getExcel(
    model?: Partial<GridSearchModel<TKey, TSearch>> | null,
    options?: GetExcelOptions,
  ): Observable<ArrayBuffer | Blob> {
    const data = { ...createGridSearchModel(model), pageSize: 0 };
    return this.client.$request<ArrayBuffer | Blob>(
      this.buildPath(this.endpoints.getExcel),
      { method: 'POST', data, responseType: options?.responseType ?? 'arraybuffer' },
    ).pipe(
      catchError((error: unknown) => from(decodeErrorBody(error)).pipe(
        switchMap((decoded) => {
          this.reportFailure('getExcel', decoded);
          return throwError(() => decoded);
        }),
      )),
    );
  }
}

/**
 * With a binary `responseType` an error body arrives as bytes. Turn it back
 * into JSON or text, keeping status and message. The original error was
 * already reported on `httpError$`, so the decoded copy is not reported again.
 */
async function decodeErrorBody(error: unknown): Promise<unknown> {
  if (!(error instanceof SardanapalHttpError)) {
    return error;
  }

  const text = await readText(error.body);
  if (text === null) {
    return error;
  }

  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON: keep the text.
  }
  return new SardanapalHttpError(error.message, error.status, body, error.mustChangePassword);
}

async function readText(body: unknown): Promise<string | null> {
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.text();
  }
  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }
  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(body);
  }
  return null;
}
