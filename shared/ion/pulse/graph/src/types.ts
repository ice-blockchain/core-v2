export interface PulseLink {
  '#': string;
}

export interface PulseMeta {
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  expiresAt?: number;
}

export type PulsePrimitive = string | number | boolean | null;
export type PulseValue = PulsePrimitive | PulseLink;
export type PulseProperties = Record<string, PulseValue>;

export interface PulseNode {
  soul: string;
  properties: PulseProperties;
  meta: PulseMeta;
}

export interface PulseGraphConfig {
  partitionId?: string;
}

export interface PulseErasure {
  soul: string;
  erasedAt: number;
  reason?: string;
}
