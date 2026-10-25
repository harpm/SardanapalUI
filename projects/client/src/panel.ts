import type { Observable } from 'rxjs';
import {
  SardanapalCrudClient,
  defaultCrudEndpoints,
  type CrudEndpointMap,
  type SardanapalCrudClientOptions,
} from './crud';
import { createGridSearchModel, type EntityKey, type GridResult, type GridSearchModel, type SelectOption } from './grid';
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
   * call rejects with `SardanapalHttpError`. Its `body` is what axios returns for
   * the requested `responseType`, so an `ArrayBuffer` or `Blob`, not parsed JSON.
   */
  $getExcel(
    model?: Partial<GridSearchModel<TKey, TSearch>> | null,
    options?: GetExcelOptions,
  ): Observable<ArrayBuffer | Blob> {
    const data = { ...createGridSearchModel(model), pageSize: 0 };
    return this.$call<ArrayBuffer | Blob>(
      'getExcel',
      this.buildPath(this.endpoints.getExcel),
      { method: 'POST', data, responseType: options?.responseType ?? 'arraybuffer' },
    );
  }
}
