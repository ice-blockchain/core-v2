export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string;
  sig: string;
  tags: string[][];
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [tagKey: `#${string}`]: string[] | undefined;
}

export interface StoredEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  content: string;
  sig: string;
  tags: string;
  raw_json: string;
  search_text: string | null;
}

export interface PruneOptions {
  maxEventsPerKind?: number;
  maxAgeMs?: number;
  excludeKinds?: number[];
}
