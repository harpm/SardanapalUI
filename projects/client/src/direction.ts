import { Subject, type Observable } from 'rxjs';
import { MemoryStorage, type KeyValueStorage } from './storage';

export type TextDirection = 'ltr' | 'rtl';

/** The part of `document` the service writes to. Pass a fake in tests or outside a browser. */
export interface DirectionTarget {
  documentElement: { dir: string };
}

export interface SardanapalDirectionServiceOptions {
  /** Direction used when none is saved. Defaults to `ltr`. */
  defaultDirection?: TextDirection;
  /** Persists the chosen direction. Defaults to an in-memory store. */
  storage?: KeyValueStorage;
  /** Receives `dir`. Defaults to the global `document`, when there is one. */
  target?: DirectionTarget | null;
}

/**
 * Owns the page direction and nothing else. It sets `dir` on the target's
 * `documentElement`, remembers the choice, and emits on `directionChanged$` when
 * the direction actually changes, so other services (language, the Angular bridge)
 * can react. It knows nothing about language or culture.
 */
export class SardanapalDirectionService {
  private static readonly DIRECTION_STORAGE_KEY = 'sardanapal.direction';
  private static readonly DEFAULT_DIRECTION: TextDirection = 'ltr';

  /** Emits the new direction each time it changes. It does not replay; read `getDirection()` for the current one. */
  readonly directionChanged$: Observable<TextDirection>;

  private readonly storage: KeyValueStorage;
  private readonly target: DirectionTarget | null;
  private readonly changedSubject$ = new Subject<TextDirection>();
  private direction: TextDirection;

  constructor(options: SardanapalDirectionServiceOptions = {}) {
    this.storage = options.storage ?? new MemoryStorage();
    this.target = options.target !== undefined ? options.target : SardanapalDirectionService.globalTarget();
    this.directionChanged$ = this.changedSubject$.asObservable();

    this.direction = this.readSaved()
      ?? options.defaultDirection
      ?? SardanapalDirectionService.DEFAULT_DIRECTION;
    this.apply(this.direction);
  }

  getDirection(): TextDirection {
    return this.direction;
  }

  /** Applies and saves the direction. Emits `directionChanged$` only when it differs from the current one. */
  setDirection(direction: TextDirection): void {
    if (direction !== 'ltr' && direction !== 'rtl') {
      throw new Error(`Invalid direction: ${String(direction)}.`);
    }
    this.storage.set(SardanapalDirectionService.DIRECTION_STORAGE_KEY, direction);
    this.apply(direction);
    if (direction !== this.direction) {
      this.direction = direction;
      this.changedSubject$.next(direction);
    }
  }

  private readSaved(): TextDirection | null {
    const saved = this.storage.get(SardanapalDirectionService.DIRECTION_STORAGE_KEY)?.trim();
    return saved === 'ltr' || saved === 'rtl' ? saved : null;
  }

  private apply(direction: TextDirection): void {
    if (this.target) {
      this.target.documentElement.dir = direction;
    }
  }

  private static globalTarget(): DirectionTarget | null {
    const candidate = (globalThis as { document?: DirectionTarget }).document;
    return candidate?.documentElement ? candidate : null;
  }
}
