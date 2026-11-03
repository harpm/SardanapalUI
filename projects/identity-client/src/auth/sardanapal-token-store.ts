import { MemoryStorage, type KeyValueStorage } from '@harpm/sardanapal-client';

/** Reads and writes the cached JWT through a session store and an optional persistent store. */
export class SardanapalTokenStore {
  private static readonly KEY = 'sardanapal.auth.token';

  private remember = false;

  constructor(
    private readonly storage: KeyValueStorage = new MemoryStorage(),
    private readonly persistent?: KeyValueStorage,
  ) {}

  /**
   * Chooses where the next `write` goes. `true` uses persistent storage when
   * one was given; `false` uses the session store.
   */
  setRememberMe(remember: boolean): void {
    this.remember = remember;
  }

  read(): string | null {
    const persisted = SardanapalTokenStore.tokenFrom(this.persistent);
    if (persisted) {
      this.remember = true;
      return persisted;
    }
    return SardanapalTokenStore.tokenFrom(this.storage);
  }

  write(token: string): void {
    if (this.remember && this.persistent) {
      this.persistent.set(SardanapalTokenStore.KEY, token);
      this.storage.remove(SardanapalTokenStore.KEY);
      return;
    }
    this.storage.set(SardanapalTokenStore.KEY, token);
    this.persistent?.remove(SardanapalTokenStore.KEY);
  }

  clear(): void {
    this.storage.remove(SardanapalTokenStore.KEY);
    this.persistent?.remove(SardanapalTokenStore.KEY);
    this.remember = false;
  }

  private static tokenFrom(storage: KeyValueStorage | undefined): string | null {
    const token = storage?.get(SardanapalTokenStore.KEY);
    return token && token.trim() ? token : null;
  }
}
