export interface PulseStorageAdapter {
  readonly saveDocument: (docId: string, state: Uint8Array) => Promise<void>;
  readonly loadDocument: (docId: string) => Promise<Uint8Array | null>;
  readonly deleteDocument: (docId: string) => Promise<boolean>;
  readonly eraseDocument: (docId: string) => Promise<boolean>;
  readonly queryRange: (options: PulseRangeQuery) => Promise<string[]>;
}

export interface PulseRangeQuery {
  readonly start: string;
  readonly end: string;
  readonly limit?: number;
}

export interface PulseLmdbConfig {
  readonly path: string;
  readonly mapSize?: number;
  readonly maxDbs?: number;
}
