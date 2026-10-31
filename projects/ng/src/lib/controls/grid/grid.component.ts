import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DEFAULT_PAGE_SIZE,
  StatusCode,
  type GridResult,
  type IResponse,
} from '@sardanapal/client';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule, type NzTableSortOrder } from 'ng-zorro-antd/table';
import { catchError, finalize, map, of, Subject, switchMap, tap, type Observable } from 'rxjs';
import type { SardanapalGridSource } from '../sources';

/** One column of `s-grid`. */
export interface SardanapalGridColumn<TItem = unknown> {
  /** Property of the row. A dotted path such as `customer.name` reads nested values. Also sent as `sortId`. */
  field: string;
  title: string;
  /** Lets the user sort by this column. The host sorts by the `field` name. */
  sortable?: boolean;
  /** Any CSS width, for example `120px`. */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Turns the cell value into text. Without it, `null` is empty, dates use the local format, and everything else is `String(value)`. */
  format?: (value: unknown, row: TItem) => string;
}

/**
 * A page of rows from a CRUD or panel client, with paging and sorting done by
 * the host through `$getAll`. `nz-table` is behind this API, so it can be
 * replaced without renaming the component.
 *
 * It loads when it is created and goes back to the first page when `client`,
 * `searchFields` or `pageSize` changes, so pass a new `searchFields` object to
 * search again. `reload()` fetches the current page again. `pageIndex` is
 * zero-based on the wire; the pager shows it one-based.
 *
 * A failed request is reported on the shared error channel and leaves the grid
 * empty. A failure envelope in a 2xx body shows its `userMessage`.
 */
@Component({
  selector: 's-grid',
  imports: [NzTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }'],
  templateUrl: './grid.component.html',
})
export class SardanapalGridComponent<TItem extends object = Record<string, unknown>> implements OnChanges {
  /** A CRUD or panel client. */
  @Input({ required: true }) client!: SardanapalGridSource<TItem>;
  @Input({ required: true }) columns!: ReadonlyArray<SardanapalGridColumn<TItem>>;
  /** The search VM sent as `fields`. Pass a new object to search again. */
  @Input() searchFields: unknown = null;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() pageSizeOptions: number[] = [10, 25, 50, 100];
  @Input({ transform: booleanAttribute }) showSizeChanger = true;
  @Input() size: 'small' | 'middle' | 'default' = 'default';
  /** Property that identifies a row, used to track rows between pages. */
  @Input() rowKey = 'id';
  /** Property to sort by at first. */
  @Input() sortId: string | undefined = undefined;
  @Input() sortAscending = true;

  /** Emits the server result each time a page loads. */
  @Output() readonly loaded = new EventEmitter<GridResult<TItem>>();

  protected readonly rows = signal<TItem[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  /** Zero-based. */
  protected readonly pageIndex = signal(0);
  /** What the user chose in the pager and on the headers. Reset when the matching input changes. */
  protected readonly currentPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly currentSortId = signal<string | undefined>(undefined);
  protected readonly currentSortAscending = signal(true);

  private readonly message = inject(NzMessageService);
  private readonly load$ = new Subject<void>();

  constructor() {
    this.load$
      .pipe(
        switchMap(() => this.fetch()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('pageSize' in changes) {
      this.currentPageSize.set(this.pageSize);
    }
    if ('sortId' in changes) {
      this.currentSortId.set(this.sortId);
    }
    if ('sortAscending' in changes) {
      this.currentSortAscending.set(this.sortAscending);
    }
    if ('client' in changes || 'searchFields' in changes || 'pageSize' in changes) {
      this.pageIndex.set(0);
      this.load$.next();
    }
  }

  /** Fetches the current page again. */
  reload(): void {
    this.load$.next();
  }

  protected onPageIndex(oneBased: number): void {
    const index = oneBased - 1;
    if (index !== this.pageIndex()) {
      this.pageIndex.set(index);
      this.load$.next();
    }
  }

  protected onPageSize(size: number): void {
    if (size !== this.currentPageSize()) {
      this.currentPageSize.set(size);
      this.pageIndex.set(0);
      this.load$.next();
    }
  }

  /**
   * `nz-table` also reports `null` for the columns that lost the sort when another
   * column is sorted, so a `null` is only a real clear for the column that is sorted.
   */
  protected onSort(column: SardanapalGridColumn<TItem>, order: string | null): void {
    if (order === null) {
      if (this.currentSortId() !== column.field) {
        return;
      }
      this.currentSortId.set(undefined);
      this.currentSortAscending.set(true);
    } else {
      const ascending = order !== 'descend';
      if (this.currentSortId() === column.field && this.currentSortAscending() === ascending) {
        return;
      }
      this.currentSortId.set(column.field);
      this.currentSortAscending.set(ascending);
    }
    this.pageIndex.set(0);
    this.load$.next();
  }

  protected sortOrderOf(column: SardanapalGridColumn<TItem>): NzTableSortOrder {
    if (column.sortable !== true || this.currentSortId() !== column.field) {
      return null;
    }
    return this.currentSortAscending() ? 'ascend' : 'descend';
  }

  protected keyOf(row: TItem, index: number): unknown {
    return SardanapalGridComponent.valueAt(row, this.rowKey) ?? index;
  }

  protected cellText(row: TItem, column: SardanapalGridColumn<TItem>): string {
    const value = SardanapalGridComponent.valueAt(row, column.field);
    if (column.format) {
      return column.format(value, row);
    }
    if (value === null || value === undefined) {
      return '';
    }
    return value instanceof Date ? value.toLocaleString() : String(value);
  }

  /** Requests the current page. Failed requests are already reported on the shared error channel. */
  private fetch(): Observable<void> {
    this.loading.set(true);
    return this.client
      .$getAll({
        fields: this.searchFields,
        sortId: this.currentSortId(),
        sortAscending: this.currentSortAscending(),
        pageIndex: this.pageIndex(),
        pageSize: this.currentPageSize(),
      })
      .pipe(
        tap((result) => this.apply(result)),
        map(() => undefined),
        catchError(() => {
          this.rows.set([]);
          this.total.set(0);
          return of(undefined);
        }),
        finalize(() => this.loading.set(false)),
      );
  }

  private apply(result: IResponse<GridResult<TItem>>): void {
    if (result.statusCode !== StatusCode.Succeeded || !result.data) {
      this.rows.set([]);
      this.total.set(0);
      if (result.userMessage?.trim()) {
        this.message.error(result.userMessage);
      }
      return;
    }
    this.rows.set(result.data.list);
    this.total.set(result.data.searchModel.totalCount);
    this.loaded.emit(result.data);
  }

  private static valueAt(row: object, path: string): unknown {
    let current: unknown = row;
    for (const part of path.split('.')) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
