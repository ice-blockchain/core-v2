import type { Primitive, PulseLink, PulseMeta, PulseNode } from './types';

export function createPulseNode(
  soul: string,
  properties: Record<string, Primitive | PulseLink>,
): PulseNode {
  const now = Date.now();
  const meta: PulseMeta = {
    soul,
    created: now,
    updated: now,
  };

  return { soul, properties, meta };
}

export function isPulseLink(value: unknown): value is PulseLink {
  if (typeof value !== 'object' || value === null) return false;
  return '#' in value && typeof (value as Record<string, unknown>)['#'] === 'string';
}

export function extractLinks(node: PulseNode): PulseLink[] {
  const links: PulseLink[] = [];

  for (const value of Object.values(node.properties)) {
    if (isPulseLink(value)) {
      links.push(value);
    }
  }

  return links;
}

export function validateSoul(soul: string): boolean {
  return typeof soul === 'string' && soul.length > 0;
}
