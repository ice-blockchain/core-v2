export type Primitive = string | number | boolean | null;

export interface PulseLink {
  readonly '#': string;
}

export interface PulseMeta {
  readonly soul: string;
  readonly created: number;
  readonly updated: number;
  readonly deleted?: boolean;
  readonly expiresAt?: number;
}

export interface PulseNode {
  readonly soul: string;
  readonly properties: Record<string, Primitive | PulseLink>;
  readonly meta: PulseMeta;
}

export interface PulseGraphConfig {
  readonly partitionId?: string;
}

export interface PulseQueryOptions {
  readonly prefix: string;
  readonly limit?: number;
}
