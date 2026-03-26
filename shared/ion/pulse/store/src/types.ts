export interface PulseDocumentEntry {
  docId: string;
  state: Uint8Array;
  updatedAt: number;
}

export interface PulseStoreConfig {
  path: string;
  flushIntervalMs?: number;
  maxDatabaseSize?: number;
}

export interface PulseStorageAdapter {
  saveDocument(docId: string, state: Uint8Array): Promise<void>;
  loadDocument(docId: string): Promise<Uint8Array | null>;
  queryRange(start: string, end: string): Promise<PulseDocumentEntry[]>;
  deleteDocument(docId: string): Promise<boolean>;
  eraseDocument(docId: string): Promise<boolean>;
  listDocuments(prefix?: string): Promise<string[]>;
  close(): Promise<void>;
}
