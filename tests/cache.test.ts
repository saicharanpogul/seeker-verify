import { describe, it, expect, vi, beforeEach } from "vitest";
import { LRUCache } from "../src/cache";

describe("LRUCache", () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 3, ttlSeconds: 10 });
  });

  it("stores and retrieves values", () => {
    cache.set("a", "value-a");
    expect(cache.get("a")).toBe("value-a");
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts least recently used entry when full", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    // Cache is full, adding "d" should evict "a" (LRU)
    cache.set("d", "4");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("accessing a key makes it recently used", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access "a" to make it recently used
    cache.get("a");

    // Adding "d" should now evict "b" (the new LRU)
    cache.set("d", "4");

    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    vi.useFakeTimers();

    const shortCache = new LRUCache<string>({ maxSize: 10, ttlSeconds: 5 });
    shortCache.set("key", "value");

    expect(shortCache.get("key")).toBe("value");

    // Advance time past TTL
    vi.advanceTimersByTime(6000);

    expect(shortCache.get("key")).toBeUndefined();

    vi.useRealTimers();
  });

  it("has() returns correct status", () => {
    cache.set("key", "value");
    expect(cache.has("key")).toBe(true);
    expect(cache.has("missing")).toBe(false);
  });

  it("delete() removes entries", () => {
    cache.set("key", "value");
    expect(cache.delete("key")).toBe(true);
    expect(cache.get("key")).toBeUndefined();
    expect(cache.delete("missing")).toBe(false);
  });

  it("clear() removes all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("updates existing keys without increasing size", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("a", "updated");

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBe("updated");
  });

  it("reports size correctly", () => {
    expect(cache.size).toBe(0);
    cache.set("a", "1");
    expect(cache.size).toBe(1);
    cache.set("b", "2");
    expect(cache.size).toBe(2);
  });
});
