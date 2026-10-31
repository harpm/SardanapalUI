import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  Input,
  signal,
  type OnChanges,
  type SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  DEFAULT_PAGE_SIZE,
  StatusCode,
  type EntityKey,
  type SelectOption,
} from '@sardanapal/client';
import { NzSelectModule } from 'ng-zorro-antd/select';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  of,
  Subject,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import { SardanapalControlBase } from '../../control-base';
import type { SardanapalDictionarySource } from '../sources';

/**
 * Pick one key, or several with `multiple`. The options come from one of two places:
 *
 * - `options`: a static list of `{ key, value }`, where `value` is the label.
 * - `dictionary`: a panel client. The control calls `$getDictionary` when it is
 *   created and whenever `dictionary` or `dictionaryFields` changes.
 *
 * With a `dictionary`, it loads one page and sends what the user types to the
 * host as `dynamicField`, after a short pause. `dictionaryFields` is the search
 * VM and is sent as `fields`. A selected key that is not in the loaded rows
 * shows no label. Without a `dictionary`, the user filters the static `options`
 * in the browser.
 *
 * The value is the key, an array of keys with `multiple`, or `null` when cleared.
 */
@Component({
  selector: 's-select',
  imports: [FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [':host { display: block; }', 'nz-select { width: 100%; }'],
  templateUrl: './select.component.html',
})
export class SardanapalSelectComponent<TKey extends EntityKey = EntityKey>
  extends SardanapalControlBase<TKey | TKey[]>
  implements OnChanges
{
  private static readonly SEARCH_DEBOUNCE_MS = 300;

  /** Static options. Ignored while `dictionary` is set. */
  @Input() options: ReadonlyArray<SelectOption<TKey>> = [];
  /** A panel client to load the options from. */
  @Input() dictionary: SardanapalDictionarySource | null = null;
  /** The search VM sent as `fields` with every `$getDictionary` call. */
  @Input() dictionaryFields: Record<string, unknown> | null = null;
  /** Rows per `$getDictionary` call. */
  @Input() dictionaryPageSize = DEFAULT_PAGE_SIZE;
  @Input({ transform: booleanAttribute }) multiple = false;
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) allowClear = true;
  @Input() size: 'large' | 'default' | 'small' = 'default';

  protected readonly loading = signal(false);
  private readonly loaded = signal<ReadonlyArray<SelectOption<TKey>>>([]);
  private readonly currentDictionary = signal<SardanapalDictionarySource | null>(null);
  private readonly currentOptions = signal<ReadonlyArray<SelectOption<TKey>>>([]);
  private readonly search$ = new Subject<string>();
  private readonly reload$ = new Subject<void>();

  protected readonly items = computed(() =>
    this.currentDictionary() ? this.loaded() : this.currentOptions(),
  );
  protected readonly serverSearch = computed(() => !!this.currentDictionary());

  constructor() {
    super();

    merge(
      this.reload$.pipe(map(() => '')),
      this.search$.pipe(
        debounceTime(SardanapalSelectComponent.SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
      ),
    )
      .pipe(
        switchMap((text) => this.load(text)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('options' in changes) {
      this.currentOptions.set(this.options);
    }
    if ('dictionary' in changes) {
      this.currentDictionary.set(this.dictionary);
    }
    if ('dictionary' in changes || 'dictionaryFields' in changes) {
      this.reload$.next();
    }
  }

  protected label(option: SelectOption<TKey>): string {
    return String(option.value);
  }

  protected onSearch(text: string): void {
    if (this.serverSearch()) {
      this.search$.next(text.trim());
    }
  }

  /** Loads the rows for the typed text. Failed requests are reported on the shared error channel. */
  private load(text: string): Observable<void> {
    const dictionary = this.dictionary;
    if (!dictionary) {
      this.loaded.set([]);
      return of(undefined);
    }

    this.loading.set(true);
    return dictionary.$getDictionary(this.modelFor(text)).pipe(
      tap((result) =>
        this.loaded.set(
          result.statusCode === StatusCode.Succeeded
            ? ((result.data?.list ?? []) as ReadonlyArray<SelectOption<TKey>>)
            : [],
        ),
      ),
      map(() => undefined),
      catchError(() => {
        this.loaded.set([]);
        return of(undefined);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private modelFor(text: string): {
    fields: Record<string, unknown> | null;
    dynamicField: string;
    pageSize: number;
  } {
    return {
      fields: this.dictionaryFields,
      dynamicField: text,
      pageSize: this.dictionaryPageSize,
    };
  }
}
