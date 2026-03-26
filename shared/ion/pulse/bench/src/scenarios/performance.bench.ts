import { describe, it, expect } from 'vitest';
import { createPulseRelay } from '../pulse-relay.js';
import { createPulseClient } from '../client-worker.js';
import { generatePulseEvents } from '../data-generator.js';
import type { PulseRelayInstance } from '../pulse-relay.js';
import type { PulseClient } from '../client-worker.js';

const RELAY_COUNT = 3;
const CLIENT_COUNT = 6;
const EVENTS_PER_CLIENT = 50;
const READ_SAMPLE_SIZE = 100;

interface TimingResult { durationMs: number; count: number }

function createPeeredRelays(count: number): PulseRelayInstance[] {
  const relays = Array.from({ length: count }, (_, i) =>
    createPulseRelay({ peerId: `perf-relay-${i}` })
  );
  for (const relay of relays) {
    for (const other of relays) {
      if (relay.peerId !== other.peerId) relay.addPeer(other.peerId);
    }
  }
  return relays;
}

function createBenchClients(relays: PulseRelayInstance[]): PulseClient[] {
  return Array.from({ length: CLIENT_COUNT }, (_, i) =>
    createPulseClient({ userId: `perf-user-${i}`, relayEndpoint: relays[i % relays.length]! })
  );
}

async function measureWrites(clients: PulseClient[]): Promise<TimingResult> {
  const start = performance.now();
  await Promise.all(clients.map((c) => {
    const events = generatePulseEvents({ userId: c.userId, eventCount: EVENTS_PER_CLIENT });
    return c.writeEvents(events);
  }));
  return { durationMs: performance.now() - start, count: CLIENT_COUNT * EVENTS_PER_CLIENT };
}

async function measureReads(relay: PulseRelayInstance): Promise<TimingResult> {
  const nodes = relay.graph.pulseQuery('');
  if (nodes.length === 0) return { durationMs: 0, count: 0 };
  const soul = nodes[0]!.soul;
  const start = performance.now();
  for (let i = 0; i < READ_SAMPLE_SIZE; i++) {
    await relay.getData(soul);
  }
  return { durationMs: performance.now() - start, count: READ_SAMPLE_SIZE };
}

async function measureSyncTime(relays: PulseRelayInstance[]): Promise<TimingResult> {
  let pairs = 0;
  const start = performance.now();
  for (let i = 0; i < relays.length; i++) {
    for (let j = i + 1; j < relays.length; j++) {
      await relays[i]!.syncWith(relays[j]!);
      pairs++;
    }
  }
  return { durationMs: performance.now() - start, count: pairs };
}

function logStats(write: TimingResult, read: TimingResult, sync: TimingResult): void {
  const writeRate = Math.round(write.count / (write.durationMs / 1000));
  const readAvg = read.count > 0 ? read.durationMs / read.count : 0;
  console.log(`Write: ${write.count} events in ${write.durationMs.toFixed(1)}ms (${writeRate} events/sec)`);
  console.log(`Read: avg ${readAvg.toFixed(3)}ms per read (${read.count} reads)`);
  console.log(`Sync: ${sync.count} relay pairs in ${sync.durationMs.toFixed(1)}ms`);
}

describe('Performance', () => {
  it('measures write throughput, read latency, and sync time', async () => {
    const relays = createPeeredRelays(RELAY_COUNT);
    const clients = createBenchClients(relays);

    const writes = await measureWrites(clients);
    const reads = await measureReads(relays[0]!);
    const syncs = await measureSyncTime(relays);

    logStats(writes, reads, syncs);

    const writeRate = writes.count / (writes.durationMs / 1000);
    expect(writeRate).toBeGreaterThan(0);
    expect(syncs.durationMs).toBeLessThan(30000);

    relays.forEach((r) => r.destroy());
  });
});
