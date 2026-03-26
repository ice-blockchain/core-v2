import { createPulseRelay } from './pulse-relay.js';
import { createPulseClient } from './client-worker.js';
import { generatePulseEvents } from './data-generator.js';
import type { PulseRelayInstance } from './pulse-relay.js';
import type { PulseClient } from './client-worker.js';
import type { BenchConfig, BenchReport, BenchScenarioResult } from './types.js';

export async function runPulseBenchmark(config: BenchConfig): Promise<BenchReport> {
  const startedAt = Date.now();
  const relays = createRelays(config.relayCount);
  peerAllRelays(relays);
  const clients = createClients(config.clientCount, relays);

  const writeResult = await measureWrites(clients, config.eventsPerClient);
  const syncResult = await measureSync(relays);
  const verifyResult = await verifyConvergence(relays);

  destroyAll(relays, clients);
  return buildBenchReport(startedAt, config, [writeResult, syncResult, verifyResult]);
}

function createRelays(count: number): PulseRelayInstance[] {
  return Array.from({ length: count }, (_, i) =>
    createPulseRelay({ peerId: `relay-${i}` })
  );
}

function peerAllRelays(relays: PulseRelayInstance[]): void {
  for (const relay of relays) {
    for (const other of relays) {
      if (relay.peerId !== other.peerId) relay.addPeer(other.peerId);
    }
  }
}

function createClients(count: number, relays: PulseRelayInstance[]): PulseClient[] {
  return Array.from({ length: count }, (_, i) => {
    const relay = relays[i % relays.length]!;
    return createPulseClient({ userId: `user-${i}`, relayEndpoint: relay });
  });
}

async function measureWrites(clients: PulseClient[], eventsPerClient: number): Promise<BenchScenarioResult> {
  const start = Date.now();
  try {
    await Promise.all(clients.map((client) => {
      const events = generatePulseEvents({ userId: client.userId, eventCount: eventsPerClient });
      return client.writeEvents(events);
    }));
    return { name: 'client-writes', passed: true, durationMs: Date.now() - start };
  } catch (error) {
    return buildErrorResult('client-writes', start, error);
  }
}

async function measureSync(relays: PulseRelayInstance[]): Promise<BenchScenarioResult> {
  const start = Date.now();
  try {
    for (let i = 0; i < relays.length; i++) {
      for (let j = i + 1; j < relays.length; j++) {
        await relays[i]!.syncWith(relays[j]!);
      }
    }
    return { name: 'relay-sync', passed: true, durationMs: Date.now() - start };
  } catch (error) {
    return buildErrorResult('relay-sync', start, error);
  }
}

async function verifyConvergence(relays: PulseRelayInstance[]): Promise<BenchScenarioResult> {
  const start = Date.now();
  try {
    const referenceNodes = relays[0]!.graph.pulseQuery('');
    const sample = referenceNodes.slice(0, 5);
    for (const node of sample) {
      for (const relay of relays) {
        const found = await relay.getData(node.soul);
        if (!found) throw new Error(`${relay.peerId} missing ${node.soul}`);
      }
    }
    return { name: 'verification', passed: true, durationMs: Date.now() - start };
  } catch (error) {
    return buildErrorResult('verification', start, error);
  }
}

function destroyAll(relays: PulseRelayInstance[], clients: PulseClient[]): void {
  for (const client of clients) client.disconnect();
  for (const relay of relays) relay.destroy();
}

function buildBenchReport(startedAt: number, config: BenchConfig, results: BenchScenarioResult[]): BenchReport {
  const completedAt = Date.now();
  const passed = results.filter((r) => r.passed).length;
  return {
    startedAt,
    completedAt,
    config,
    results,
    summary: { total: results.length, passed, failed: results.length - passed, durationMs: completedAt - startedAt },
  };
}

function buildErrorResult(name: string, startTime: number, error: unknown): BenchScenarioResult {
  const message = error instanceof Error ? error.message : String(error);
  return { name, passed: false, durationMs: Date.now() - startTime, error: message };
}
