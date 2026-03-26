import * as Y from 'yjs';

import type {
  PulseNode,
  PulseProperties,
  PulsePutInput,
  PulseQueryOptions,
  PulseQueryResult,
  PulseValue,
} from './types';
import { createPulseMeta, denormalizePulseInput } from './pulse-node';

/** A Pulse graph engine backed by a Yjs Y.Doc. */
export interface PulseGraph {
  readonly doc: Y.Doc;
  pulsePut(soul: string, data: PulsePutInput): PulseNode[];
  pulseGet(soul: string): PulseNode | null;
  pulseDelete(soul: string): boolean;
  pulseQuery(options: PulseQueryOptions): PulseQueryResult;
}

/** Create a new PulseGraph backed by a Yjs Y.Doc. */
export function createPulseGraph(doc?: Y.Doc): PulseGraph {
  const yDoc = doc ?? new Y.Doc();
  const nodesMap = yDoc.getMap<Y.Map<unknown>>('pulse:nodes');

  return {
    doc: yDoc,
    pulsePut: (soul, data) => executePulsePut(nodesMap, soul, data),
    pulseGet: (soul) => executePulseGet(nodesMap, soul),
    pulseDelete: (soul) => executePulseDelete(nodesMap, soul),
    pulseQuery: (options) => executePulseQuery(nodesMap, options),
  };
}

function executePulsePut(
  nodesMap: Y.Map<Y.Map<unknown>>,
  soul: string,
  data: PulsePutInput,
): PulseNode[] {
  const { nodes: denormalized } = denormalizePulseInput({ soul, data });
  const results: PulseNode[] = [];

  for (const { soul: nodeSoul, properties } of denormalized) {
    const yNode = getOrCreateYNode(nodesMap, nodeSoul);
    applyProperties(yNode, properties);
    updateTimestamp(yNode);
    const node = resolveYNodeToPulseNode(nodeSoul, yNode);
    if (node) results.push(node);
  }

  return results;
}

function executePulseGet(
  nodesMap: Y.Map<Y.Map<unknown>>,
  soul: string,
): PulseNode | null {
  const yNode = nodesMap.get(soul);
  if (!yNode) return null;
  return resolveYNodeToPulseNode(soul, yNode);
}

function executePulseDelete(
  nodesMap: Y.Map<Y.Map<unknown>>,
  soul: string,
): boolean {
  const yNode = nodesMap.get(soul);
  if (!yNode) return false;

  const metaMap = yNode.get('_meta') as Y.Map<unknown> | undefined;
  if (!metaMap) return false;

  metaMap.set('isDeleted', true);
  metaMap.set('updatedAt', Date.now());
  return true;
}

function executePulseQuery(
  nodesMap: Y.Map<Y.Map<unknown>>,
  options: PulseQueryOptions,
): PulseQueryResult {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  const matchingNodes: PulseNode[] = [];

  const allKeys = collectMatchingKeys(nodesMap, options.prefix);
  allKeys.sort();

  const sliced = allKeys.slice(offset, offset + limit + 1);
  const hasMore = sliced.length > limit;
  const keysToResolve = hasMore ? sliced.slice(0, limit) : sliced;

  for (const key of keysToResolve) {
    const yNode = nodesMap.get(key);
    if (!yNode) continue;
    const node = resolveYNodeToPulseNode(key, yNode);
    if (node && !node.meta.isDeleted) matchingNodes.push(node);
  }

  return { nodes: matchingNodes, hasMore };
}

function collectMatchingKeys(
  nodesMap: Y.Map<Y.Map<unknown>>,
  prefix: string,
): string[] {
  const keys: string[] = [];
  for (const key of nodesMap.keys()) {
    if (key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

function getOrCreateYNode(
  nodesMap: Y.Map<Y.Map<unknown>>,
  soul: string,
): Y.Map<unknown> {
  let yNode = nodesMap.get(soul);
  if (yNode) return yNode;

  yNode = new Y.Map<unknown>();
  const meta = createPulseMeta(soul);
  const metaMap = new Y.Map<unknown>();
  metaMap.set('soul', meta.soul);
  metaMap.set('createdAt', meta.createdAt);
  metaMap.set('updatedAt', meta.updatedAt);
  metaMap.set('isDeleted', meta.isDeleted);
  yNode.set('_meta', metaMap);
  nodesMap.set(soul, yNode);
  return yNode;
}

function applyProperties(
  yNode: Y.Map<unknown>,
  properties: PulseProperties,
): void {
  for (const [key, value] of Object.entries(properties)) {
    yNode.set(key, value);
  }
}

function updateTimestamp(yNode: Y.Map<unknown>): void {
  const metaMap = yNode.get('_meta') as Y.Map<unknown> | undefined;
  if (metaMap) metaMap.set('updatedAt', Date.now());
}

function resolveYNodeToPulseNode(
  soul: string,
  yNode: Y.Map<unknown>,
): PulseNode | null {
  const metaMap = yNode.get('_meta') as Y.Map<unknown> | undefined;
  if (!metaMap) return null;

  const properties: Record<string, PulseValue> = {};
  for (const [key, value] of yNode.entries()) {
    if (key === '_meta') continue;
    properties[key] = value as PulseValue;
  }

  return {
    soul,
    properties,
    meta: {
      soul: metaMap.get('soul') as string,
      createdAt: metaMap.get('createdAt') as number,
      updatedAt: metaMap.get('updatedAt') as number,
      isDeleted: (metaMap.get('isDeleted') as boolean) ?? false,
      expiresAt: metaMap.get('expiresAt') as number | undefined,
    },
  };
}
