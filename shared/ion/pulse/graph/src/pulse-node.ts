import type { PulseLink, PulseNode, PulseProperties, PulseValue } from './types.js';

export function isPulseLink(value: unknown): value is PulseLink {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return '#' in value && typeof (value as PulseLink)['#'] === 'string';
}

function isNestedObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  return !isPulseLink(value);
}

function buildTimestampMeta() {
  const now = Date.now();
  return { createdAt: now, updatedAt: now };
}

function convertProperties(soul: string, data: Record<string, unknown>): PulseProperties {
  const properties: PulseProperties = {};

  for (const [key, value] of Object.entries(data)) {
    if (isNestedObject(value)) {
      const childSoul = `${soul}/${key}`;
      properties[key] = { '#': childSoul } as PulseValue;
    } else {
      properties[key] = value as PulseValue;
    }
  }

  return properties;
}

export function createPulseNode(soul: string, properties: Record<string, unknown>): PulseNode {
  return {
    soul,
    properties: convertProperties(soul, properties),
    meta: buildTimestampMeta(),
  };
}

export function flattenNestedProperties(soul: string, data: Record<string, unknown>): PulseNode[] {
  const nodes: PulseNode[] = [];
  const rootNode = createPulseNode(soul, data);
  nodes.push(rootNode);

  for (const [key, value] of Object.entries(data)) {
    if (!isNestedObject(value)) {
      continue;
    }
    const childSoul = `${soul}/${key}`;
    const childNodes = flattenNestedProperties(childSoul, value);
    nodes.push(...childNodes);
  }

  return nodes;
}
