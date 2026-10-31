import type { SardanapalCrudClient, SardanapalPanelClient } from '@sardanapal/client';

/**
 * Anything that has `$getDictionary`: a `SardanapalPanelClient` for any resource.
 * The key, search and item types are open so one control accepts every client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SardanapalDictionarySource = Pick<SardanapalPanelClient<any, any, any, any, any, any>, '$getDictionary'>;

/**
 * Anything that has `$getAll`: a `SardanapalCrudClient` or `SardanapalPanelClient`
 * for any resource. `TItem` is the row type the grid shows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SardanapalGridSource<TItem> = Pick<SardanapalCrudClient<any, any, any, any, any, TItem>, '$getAll'>;
