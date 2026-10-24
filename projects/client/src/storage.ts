export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    get(key: string): string | null {
      return values.get(key) ?? null;
    },
    set(key: string, value: string): void {
      values.set(key, value);
    },
    remove(key: string): void {
      values.delete(key);
    },
  };
}

export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStorage(storage: BrowserStorage): KeyValueStorage {
  return {
    get(key: string): string | null {
      return storage.getItem(key);
    },
    set(key: string, value: string): void {
      storage.setItem(key, value);
    },
    remove(key: string): void {
      storage.removeItem(key);
    },
  };
}
