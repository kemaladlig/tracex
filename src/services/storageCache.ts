export interface StorageCacheItem<T> {
  data: T;
  timestamp: number;
}

export const getStorageCacheWithTs = <T>(
  key: string,
  maxAgeMs: number,
  namespace = 'tracex_macro'
): StorageCacheItem<T> | null => {
  try {
    const raw = localStorage.getItem(`${namespace}_${key}`);
    if (!raw) return null;
    const item = JSON.parse(raw) as StorageCacheItem<T>;
    if (Date.now() - item.timestamp < maxAgeMs) return item;
  } catch {
    // Private browsing and corrupted cache should not block live data.
  }
  return null;
};

export const setStorageCache = <T>(
  key: string,
  data: T,
  namespace = 'tracex_macro'
): void => {
  try {
    const item: StorageCacheItem<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`${namespace}_${key}`, JSON.stringify(item));
  } catch {
    // Cache quota failures are safe to ignore.
  }
};
