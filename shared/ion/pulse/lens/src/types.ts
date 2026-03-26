export interface PulseVectorEntry {
  soul: string;
  vector: number[];
  metadata: PulseVectorMetadata;
}

export interface PulseVectorMetadata {
  userId?: string;
  timestamp?: number;
  labels?: string[];
  contentType?: string;
  [key: string]: unknown;
}

export interface PulseSearchResult {
  soul: string;
  score: number;
  metadata: PulseVectorMetadata;
}

export interface PulseLensConfig {
  path: string;
  tableName?: string;
  dimensions?: number;
}

export interface PulseSearchQuery {
  vector: number[];
  limit?: number;
  filter?: string;
}

export interface PulseLens {
  indexVector(entry: PulseVectorEntry): Promise<void>;
  indexVectors(entries: PulseVectorEntry[]): Promise<void>;
  search(query: PulseSearchQuery): Promise<PulseSearchResult[]>;
  deleteVector(soul: string): Promise<boolean>;
  getVectorCount(): Promise<number>;
  close(): Promise<void>;
}
