/** Primitive values that can be stored in a PulseNode property. */
export type PulsePrimitive = string | number | boolean | null;

/** A link to another node, referenced by its soul. */
export interface PulseLink {
  readonly '#': string;
}

/** Metadata attached to every PulseNode. */
export interface PulseMeta {
  readonly soul: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly isDeleted: boolean;
  readonly expiresAt?: number | undefined;
}

/** A single property value: either a primitive or a link. */
export type PulseValue = PulsePrimitive | PulseLink;

/** The properties map of a node (excluding metadata). */
export type PulseProperties = Record<string, PulseValue>;

/** A fully-resolved graph node with soul, properties, and metadata. */
export interface PulseNode {
  readonly soul: string;
  readonly properties: PulseProperties;
  readonly meta: PulseMeta;
}

/** Input for creating or updating a node. Nested objects auto-denormalize. */
export interface PulsePutInput {
  readonly [key: string]: PulsePrimitive | PulseLink | PulsePutInput;
}

/** Options for querying nodes by soul prefix. */
export interface PulseQueryOptions {
  readonly prefix: string;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

/** Result of a prefix query. */
export interface PulseQueryResult {
  readonly nodes: readonly PulseNode[];
  readonly hasMore: boolean;
}
