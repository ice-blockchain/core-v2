export interface PulseLensConfig {
  readonly storagePath: string;
}

export interface PulseVectorMetadata {
  readonly soul: string;
  readonly userId?: string;
  readonly timestamp?: number;
  readonly labels?: string[];
  readonly contentType?: string;
}

export interface PulseVectorEntry {
  readonly soul: string;
  readonly embedding: number[];
  readonly metadata: PulseVectorMetadata;
}

export interface PulseSearchQuery {
  readonly embedding: number[];
  readonly limit?: number;
  readonly filter?: string;
}

export interface PulseSearchResult {
  readonly soul: string;
  readonly score: number;
  readonly metadata: PulseVectorMetadata;
}

export interface PulseLensInstance {
  readonly indexVector: (entry: PulseVectorEntry) => Promise<void>;
  readonly search: (query: PulseSearchQuery) => Promise<PulseSearchResult[]>;
  readonly deleteVector: (soul: string) => Promise<boolean>;
  readonly getVectorCount: () => Promise<number>;
}
