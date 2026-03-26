import { createPulseGraph } from '../../graph/src/index.js';
import { createPulseSync } from '../../sync/src/index.js';
import { createPulseSignal } from '../../signal/src/index.js';
import { createPulseShard } from '../../shard/src/index.js';
import { createPulseCache } from '../../cache/src/index.js';
import { createPulseReaper } from '../../reaper/src/index.js';
import { createMemoryStore } from '../../store/src/pulse-storage-interface.js';
import type { PulseSync } from '../../sync/src/index.js';
import type { PulseSignal } from '../../signal/src/index.js';
import type { PulseShard } from '../../shard/src/index.js';
import type { PulseCache } from '../../cache/src/index.js';
import type { PulseReaper } from '../../reaper/src/index.js';
import type { PulseStorageAdapter } from '../../store/src/types.js';
import type { PulseNode } from '../../graph/src/index.js';

type PulseGraphInstance = ReturnType<typeof createPulseGraph>;

export interface PulseRelayConfig {
  peerId: string;
  shardConfig?: { minReplicas?: number; maxReplicas?: number };
}

export interface PulseRelayInstance {
  peerId: string;
  graph: PulseGraphInstance;
  sync: PulseSync;
  signal: PulseSignal;
  shard: PulseShard;
  cache: PulseCache;
  reaper: PulseReaper;
  store: PulseStorageAdapter;
  addPeer(peerId: string): void;
  removePeer(peerId: string): void;
  putData(soul: string, data: Record<string, unknown>): Promise<void>;
  getData(soul: string): Promise<PulseNode | null>;
  syncWith(otherRelay: PulseRelayInstance): Promise<void>;
  destroy(): void;
}

interface RelayModules {
  graph: PulseGraphInstance;
  sync: PulseSync;
  signal: PulseSignal;
  shard: PulseShard;
  cache: PulseCache;
  reaper: PulseReaper;
  store: PulseStorageAdapter;
}

function initModules(config: PulseRelayConfig): RelayModules {
  const graph = createPulseGraph();
  const sync = createPulseSync(graph.getDocument());
  const signal = createPulseSignal();
  const shard = createPulseShard(config.shardConfig);
  const cache = createPulseCache();
  const reaper = createPulseReaper();
  const store = createMemoryStore();
  return { graph, sync, signal, shard, cache, reaper, store };
}

function wireSignalToSync(sync: PulseSync, signal: PulseSignal): () => void {
  return sync.onUpdate((update) => signal.emit('sync', update));
}

async function executePut(modules: RelayModules, soul: string, data: Record<string, unknown>): Promise<void> {
  modules.graph.pulsePut(soul, data);
  const state = modules.sync.encodePulseState();
  await modules.store.saveDocument(soul, state);
}

async function executeSyncWith(localSync: PulseSync, otherRelay: PulseRelayInstance): Promise<void> {
  const localVector = localSync.encodePulseStateVector();
  const remoteVector = otherRelay.sync.encodePulseStateVector();
  const incoming = otherRelay.sync.computePulseSync(localVector);
  const outgoing = localSync.computePulseSync(remoteVector);
  if (incoming) localSync.applyPulseUpdate(incoming);
  if (outgoing) otherRelay.sync.applyPulseUpdate(outgoing);
}

function destroyRelay(modules: RelayModules, unsubscribe: () => void): void {
  unsubscribe();
  modules.sync.destroy();
  modules.signal.destroy();
  modules.shard.destroy();
  modules.cache.destroy();
  modules.reaper.destroy();
  void modules.store.close();
}

export function createPulseRelay(config: PulseRelayConfig): PulseRelayInstance {
  const modules = initModules(config);
  const unsubscribe = wireSignalToSync(modules.sync, modules.signal);
  modules.shard.addPeer(config.peerId);

  return {
    peerId: config.peerId,
    ...modules,
    addPeer: (peerId) => modules.shard.addPeer(peerId),
    removePeer: (peerId) => modules.shard.removePeer(peerId),
    putData: (soul, data) => executePut(modules, soul, data),
    getData: (soul) => Promise.resolve(modules.graph.pulseGet(soul)),
    syncWith: (other) => executeSyncWith(modules.sync, other),
    destroy: () => destroyRelay(modules, unsubscribe),
  };
}
