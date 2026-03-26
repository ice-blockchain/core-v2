export interface PulseCacheConfig {
  readonly maxSizeBytes?: number;
  readonly defaultTtlMs?: number;
}

export interface PulseCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly size: number;
}

export interface PulseCacheInstance {
  readonly get: (soul: string) => unknown | undefined;
  readonly set: (soul: string, value: unknown) => void;
  readonly invalidate: (soul: string) => boolean;
  readonly getStats: () => PulseCacheStats;
  readonly clear: () => void;
}
