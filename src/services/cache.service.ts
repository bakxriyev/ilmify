import { Injectable } from '@nestjs/common';

interface CacheEntry {
  data: any;
  expiry: number;
}

@Injectable()
export class CacheService {
  private store = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 60;

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttlSeconds: number = this.DEFAULT_TTL): void {
    this.store.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
  }

  del(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}
