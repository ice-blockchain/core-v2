export interface PulseCacheConfig {
  maxSizeBytes?: number;
  defaultTtlMs?: number;
}

export interface PulseCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
}

export interface PulseCache {
  get(soul: string): Uint8Array | undefined;
  set(soul: string, data: Uint8Array): void;
  invalidate(soul: string): boolean;
  invalidatePrefix(prefix: string): number;
  has(soul: string): boolean;
  getStats(): PulseCacheStats;
  clear(): void;
  destroy(): void;
}
