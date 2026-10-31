/** Key types the Core service bases use on the wire (`int`, `long`, `Guid`, `string`). */
export type EntityKey = string | number;

/**
 * Mirrors `GridSearchModelVM<TKey, TSearchVM>` from Core.
 * Property names are camelCase on the wire.
 */
export interface GridSearchModel<
  TKey extends EntityKey = EntityKey,
  TSearch = unknown,
> {
  /** Search VM. The host treats null as an empty search. */
  fields?: TSearch | null;
  /** Property name to sort by. */
  sortId?: string;
  sortAscending: boolean;
  /** Zero-based. */
  pageIndex: number;
  /** `0` means all rows. */
  pageSize: number;
  /** Filled by the server. */
  totalCount: number;
  /** Optional property names to project. */
  columns?: string[] | null;
  /** Keyset cursor when sorting by `Id`. */
  lastIdentifier?: TKey;
  /** Typed filter. `s-select` sends this with `$getDictionary`. */
  dynamicField?: string;
}

/** Mirrors `GridVM<TKey, T>`: the rows plus the search model the server used. */
export interface GridResult<TItem, TKey extends EntityKey = EntityKey> {
  list: TItem[];
  searchModel: GridSearchModel<TKey>;
}

/** Mirrors `SelectOptionVM<TKey, TValue>`. */
export interface SelectOption<
  TKey extends EntityKey = EntityKey,
  TValue = unknown,
> {
  key: TKey;
  value: TValue;
}

export const DEFAULT_PAGE_SIZE = 25;

export class GridSearchModelFactory {
  private constructor() {}

  /**
   * Builds a complete search model. Missing values and `undefined` overrides
   * fall back to the Core defaults (`sortAscending` true, `pageIndex` 0,
   * `pageSize` 25, `totalCount` 0).
   */
  static create<
    TKey extends EntityKey = EntityKey,
    TSearch = unknown,
  >(
    overrides?: Partial<GridSearchModel<TKey, TSearch>> | null,
  ): GridSearchModel<TKey, TSearch> {
    const model: GridSearchModel<TKey, TSearch> = {
      sortAscending: true,
      pageIndex: 0,
      pageSize: DEFAULT_PAGE_SIZE,
      totalCount: 0,
    };

    if (overrides) {
      for (const [name, value] of Object.entries(overrides)) {
        if (value !== undefined) {
          (model as unknown as Record<string, unknown>)[name] = value;
        }
      }
    }

    return model;
  }
}
