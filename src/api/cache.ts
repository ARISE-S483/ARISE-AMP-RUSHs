// API Cache with TTL support, inspired by monochrome's cache.js
export class APICache {
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor({ maxSize = 200, ttl = 1000 * 60 * 30 } = {}) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  private getKey(type: string, id: string): string {
    return `${type}:${id}`;
  }

  async get<T>(type: string, id: string): Promise<T | null> {
    const key = this.getKey(type, id);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set(type: string, id: string, data: unknown): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(this.getKey(type, id), { data, timestamp: Date.now() });
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
