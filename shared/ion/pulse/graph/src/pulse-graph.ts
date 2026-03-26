import * as Y from 'yjs';
import type { PulseGraphConfig, PulseNode, PulseQueryOptions, Primitive, PulseLink } from './types';
import { createPulseNode, isPulseLink } from './pulse-node';

export interface PulseGraph {
  readonly document: Y.Doc;
  readonly put: (soul: string, data: Record<string, Primitive | PulseLink>) => PulseNode;
  readonly get: (soul: string) => PulseNode | undefined;
  readonly delete: (soul: string) => void;
  readonly query: (options: PulseQueryOptions) => PulseNode[];
}

function getNodesMap(document: Y.Doc): Y.Map<string> {
  return document.getMap('nodes');
}

function serializeNode(node: PulseNode): string {
  return JSON.stringify(node);
}

function deserializeNode(raw: string): PulseNode {
  return JSON.parse(raw) as PulseNode;
}

function denormalizeNestedObjects(
  soul: string,
  data: Record<string, unknown>,
  graph: PulseGraph,
): Record<string, Primitive | PulseLink> {
  const flattened: Record<string, Primitive | PulseLink> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isNestedObject(value)) {
      const childSoul = `${soul}/${key}`;
      graph.put(childSoul, value as Record<string, Primitive | PulseLink>);
      flattened[key] = { '#': childSoul };
    } else {
      flattened[key] = value as Primitive | PulseLink;
    }
  }

  return flattened;
}

function isNestedObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (isPulseLink(value)) return false;
  return true;
}

function pulsePut(graph: PulseGraph, soul: string, data: Record<string, Primitive | PulseLink>): PulseNode {
  const nodesMap = getNodesMap(graph.document);
  const flatProperties = denormalizeNestedObjects(soul, data, graph);
  const existingRaw = nodesMap.get(soul);

  if (existingRaw) {
    return updateExistingNode(nodesMap, soul, existingRaw, flatProperties);
  }

  const node = createPulseNode(soul, flatProperties);
  nodesMap.set(soul, serializeNode(node));
  return node;
}

function updateExistingNode(
  nodesMap: Y.Map<string>,
  soul: string,
  existingRaw: string,
  properties: Record<string, Primitive | PulseLink>,
): PulseNode {
  const existing = deserializeNode(existingRaw);
  const updated: PulseNode = {
    soul,
    properties: { ...existing.properties, ...properties },
    meta: { ...existing.meta, updated: Date.now() },
  };
  nodesMap.set(soul, serializeNode(updated));
  return updated;
}

function pulseGet(graph: PulseGraph, soul: string): PulseNode | undefined {
  const nodesMap = getNodesMap(graph.document);
  const raw = nodesMap.get(soul);
  if (!raw) return undefined;

  const node = deserializeNode(raw);
  if (node.meta.deleted) return undefined;
  return node;
}

function pulseDelete(graph: PulseGraph, soul: string): void {
  const nodesMap = getNodesMap(graph.document);
  const raw = nodesMap.get(soul);
  if (!raw) return;

  const node = deserializeNode(raw);
  const deleted: PulseNode = {
    ...node,
    meta: { ...node.meta, updated: Date.now(), deleted: true },
  };
  nodesMap.set(soul, serializeNode(deleted));
}

function pulseQuery(graph: PulseGraph, options: PulseQueryOptions): PulseNode[] {
  const nodesMap = getNodesMap(graph.document);
  const results: PulseNode[] = [];

  for (const [soul, raw] of nodesMap.entries()) {
    if (!soul.startsWith(options.prefix)) continue;

    const node = deserializeNode(raw);
    if (node.meta.deleted) continue;

    results.push(node);
    if (options.limit && results.length >= options.limit) break;
  }

  return results;
}

export function createPulseGraph(_config?: PulseGraphConfig): PulseGraph {
  const document = new Y.Doc();

  const graph: PulseGraph = {
    document,
    put: (soul, data) => pulsePut(graph, soul, data),
    get: (soul) => pulseGet(graph, soul),
    delete: (soul) => pulseDelete(graph, soul),
    query: (options) => pulseQuery(graph, options),
  };

  return graph;
}
