import { MemoryStorage, type KeyValueStorage } from '@harpm/sardanapal-client';

/** Reads and writes the cached JWT through a storage adapter. */
export class SardanapalTokenStore {
  private static readonly KEY = 'sardanapal.auth.token';

  constructor(private readonly storage: KeyValueStorage = new MemoryStorage()) {}

  read(): string | null {
    const token = this.storage.get(SardanapalTokenStore.KEY);
    return token && token.trim() ? token : null;
  }

  write(token: string): void {
    this.storage.set(SardanapalTokenStore.KEY, token);
  }

  clear(): void {
    this.storage.remove(SardanapalTokenStore.KEY);
  }
}
