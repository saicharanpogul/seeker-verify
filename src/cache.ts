import { CacheConfig } from "./types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory LRU cache with TTL support.
 * No external dependencies required.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string>({ maxSize: 100, ttlSeconds: 60 });
 * cache.set("key", "value");
 * const value = cache.get("key"); // "value"
 * ```
 */
export class LRUCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly entries: Map<string, CacheEntry<T>>;

  constructor(config: CacheConfig) {
    this.maxSize = config.maxSize;
    this.ttlMs = config.ttlSeconds * 1000;
    this.entries = new Map();
  }

  /**
   * Retrieve a cached value by key.
   * Returns undefined if the key doesn't exist or has expired.
   *
   * @param key - Cache key
   * @returns The cached value or undefined
   */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.entries.delete(key);
    this.entries.set(key, entry);

    return entry.value;
  }

  /**
   * Store a value in the cache.
   * Evicts the least recently used entry if the cache is full.
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: string, value: T): void {
    // Delete existing entry to update insertion order
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }

    // Evict LRU entry if at capacity
    if (this.entries.size >= this.maxSize) {
      const lruKey = this.entries.keys().next().value;
      if (lruKey !== undefined) {
        this.entries.delete(lruKey);
      }
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Check if a key exists and has not expired.
   *
   * @param key - Cache key
   * @returns Whether the key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove a specific key from the cache.
   *
   * @param key - Cache key to remove
   * @returns Whether the key was found and removed
   */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Remove all entries from the cache. */
  clear(): void {
    this.entries.clear();
  }

  /** Get the current number of entries (including potentially expired ones). */
  get size(): number {
    return this.entries.size;
  }
}
