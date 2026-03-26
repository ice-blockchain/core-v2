import * as Y from 'yjs';
import type { PulseErasure, PulseGraphConfig, PulseNode } from './types.js';
import { flattenNestedProperties } from './pulse-node.js';

export interface PulseGraph {
  pulsePut(soul: string, data: Record<string, unknown>): PulseNode[];
  pulseGet(soul: string): PulseNode | null;
  pulseDelete(soul: string): boolean;
  pulseErase(soul: string): PulseErasure;
  pulseQuery(prefix: string): PulseNode[];
  getDocument(): Y.Doc;
  getNodesMap(): Y.Map<unknown>;
}

interface StoredNode {
  properties: Record<string, unknown>;
  meta: { createdAt: number; updatedAt: number; deletedAt?: number; expiresAt?: number };
}

function storeNodes(nodesMap: Y.Map<unknown>, nodes: PulseNode[]): void {
  for (const node of nodes) {
    const existing = nodesMap.get(node.soul) as StoredNode | undefined;
    const meta = existing
      ? { ...existing.meta, updatedAt: Date.now() }
      : { ...node.meta };

    nodesMap.set(node.soul, { properties: node.properties, meta });
  }
}

function readStoredNode(nodesMap: Y.Map<unknown>, soul: string): PulseNode | null {
  const stored = nodesMap.get(soul) as StoredNode | undefined;
  if (!stored) {
    return null;
  }
  if (stored.meta.deletedAt) {
    return null;
  }
  return { soul, properties: stored.properties, meta: stored.meta };
}

function tombstoneNode(nodesMap: Y.Map<unknown>, soul: string): boolean {
  const stored = nodesMap.get(soul) as StoredNode | undefined;
  if (!stored) {
    return false;
  }
  const updated: StoredNode = {
    ...stored,
    meta: { ...stored.meta, deletedAt: Date.now(), updatedAt: Date.now() },
  };
  nodesMap.set(soul, updated);
  return true;
}

function eraseNode(nodesMap: Y.Map<unknown>, soul: string): PulseErasure {
  nodesMap.delete(soul);
  return { soul, erasedAt: Date.now() };
}

function queryByPrefix(nodesMap: Y.Map<unknown>, prefix: string): PulseNode[] {
  const results: PulseNode[] = [];

  for (const [soul] of nodesMap.entries()) {
    if (!soul.startsWith(prefix)) {
      continue;
    }
    const node = readStoredNode(nodesMap, soul);
    if (node) {
      results.push(node);
    }
  }

  return results;
}

export function createPulseGraph(_config?: PulseGraphConfig): PulseGraph {
  const document = new Y.Doc();
  const nodesMap = document.getMap<unknown>('nodes');

  return {
    pulsePut(soul: string, data: Record<string, unknown>): PulseNode[] {
      const nodes = flattenNestedProperties(soul, data);
      document.transact(() => storeNodes(nodesMap, nodes));
      return nodes;
    },

    pulseGet(soul: string): PulseNode | null {
      return readStoredNode(nodesMap, soul);
    },

    pulseDelete(soul: string): boolean {
      return tombstoneNode(nodesMap, soul);
    },

    pulseErase(soul: string): PulseErasure {
      return eraseNode(nodesMap, soul);
    },

    pulseQuery(prefix: string): PulseNode[] {
      return queryByPrefix(nodesMap, prefix);
    },

    getDocument(): Y.Doc {
      return document;
    },

    getNodesMap(): Y.Map<unknown> {
      return nodesMap;
    },
  };
}
