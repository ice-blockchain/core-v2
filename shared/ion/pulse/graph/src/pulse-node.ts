import type { PulseLink, PulseMeta, PulseNode, PulseProperties, PulsePutInput, PulseValue } from './types';

/** Type guard: checks if a value is a PulseLink. */
export function isPulseLink(value: unknown): value is PulseLink {
  if (typeof value !== 'object' || value === null) return false;
  return '#' in value && typeof (value as PulseLink)['#'] === 'string';
}

/** Type guard: checks if a value is a nested object (not a link). */
export function isNestedObject(value: unknown): value is PulsePutInput {
  if (typeof value !== 'object' || value === null) return false;
  return !('#' in value);
}

/** Generate a unique soul for auto-denormalized child nodes. */
export function generateChildSoul(parentSoul: string, key: string): string {
  return `${parentSoul}/${key}`;
}

/** Create metadata for a new node. */
export function createPulseMeta(soul: string): PulseMeta {
  const now = Date.now();
  return { soul, createdAt: now, updatedAt: now, isDeleted: false };
}

/** Create a PulseNode from soul and flat properties. */
export function createPulseNode(soul: string, properties: PulseProperties): PulseNode {
  return { soul, properties, meta: createPulseMeta(soul) };
}

/**
 * Flatten nested input into a list of (soul, flatProperties) pairs.
 * Nested objects become separate nodes with soul references (links).
 */
export function denormalizePulseInput(input: DenormalizeInput): DenormalizeResult {
  const nodes: Array<{ soul: string; properties: PulseProperties }> = [];
  flattenNode(input.soul, input.data, nodes);
  return { nodes };
}

interface DenormalizeInput {
  readonly soul: string;
  readonly data: PulsePutInput;
}

interface DenormalizeResult {
  readonly nodes: ReadonlyArray<{ soul: string; properties: PulseProperties }>;
}

function flattenNode(
  soul: string,
  data: PulsePutInput,
  accumulator: Array<{ soul: string; properties: PulseProperties }>,
): void {
  const properties: Record<string, PulseValue> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isNestedObject(value)) {
      const childSoul = generateChildSoul(soul, key);
      properties[key] = { '#': childSoul };
      flattenNode(childSoul, value, accumulator);
    } else {
      properties[key] = value as PulseValue;
    }
  }

  accumulator.push({ soul, properties });
}
