import { describe, it, expect } from 'vitest';
import { createPulseGraph } from '../../../graph/src/index';
import { encodePulseState, applyPulseUpdate } from '../../../sync/src/index';
import { createPulseShardRing } from '../../../shard/src/index';

const WRITE_COUNT = 1000;
const READ_COUNT = 1000;
const SYNC_COUNT = 500;
const SHARD_COUNT = 1000;

interface LatencyReport {
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

function measureLatencies(operation: () => void, iterations: number): LatencyReport {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    operation();
    const end = performance.now();
    latencies.push(end - start);
  }

  return computePercentiles(latencies);
}

function computePercentiles(latencies: number[]): LatencyReport {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

function formatLatencyReport(label: string, report: LatencyReport): string {
  const p50 = report.p50.toFixed(4);
  const p95 = report.p95.toFixed(4);
  const p99 = report.p99.toFixed(4);
  return `${label}: p50=${p50}ms p95=${p95}ms p99=${p99}ms`;
}

describe('performance benchmarks', () => {
  it('measures write throughput for graph put operations', () => {
    const graph = createPulseGraph();
    const totalStart = performance.now();

    const report = measureLatencies(() => {
      const index = Math.floor(Math.random() * WRITE_COUNT);
      graph.put(`bench/node-${index}`, { value: index, label: 'test' });
    }, WRITE_COUNT);

    const totalElapsed = performance.now() - totalStart;

    console.log(formatLatencyReport('Graph PUT', report));
    console.log(`  Total: ${totalElapsed.toFixed(2)}ms for ${WRITE_COUNT} writes`);

    expect(report.p50).toBeLessThan(10);
    expect(report.p99).toBeLessThan(50);
  });

  it('measures read throughput for graph get operations', () => {
    const graph = createPulseGraph();

    for (let i = 0; i < READ_COUNT; i++) {
      graph.put(`bench/read-${i}`, { value: i });
    }

    const report = measureLatencies(() => {
      const index = Math.floor(Math.random() * READ_COUNT);
      graph.get(`bench/read-${index}`);
    }, READ_COUNT);

    const totalElapsed = computeTotalTime(report, READ_COUNT);

    console.log(formatLatencyReport('Graph GET', report));
    console.log(`  Estimated total: ${totalElapsed.toFixed(2)}ms for ${READ_COUNT} reads`);

    expect(report.p50).toBeLessThan(5);
    expect(report.p99).toBeLessThan(20);
  });

  it('measures sync throughput between two graphs', () => {
    const graphSource = createPulseGraph();
    const graphTarget = createPulseGraph();

    for (let i = 0; i < SYNC_COUNT; i++) {
      graphSource.put(`sync/item-${i}`, { value: i });
    }

    const start = performance.now();
    const update = encodePulseState(graphSource.document);
    const encodeTime = performance.now() - start;

    const applyStart = performance.now();
    applyPulseUpdate(graphTarget.document, update);
    const applyTime = performance.now() - applyStart;

    console.log(`Sync encode: ${encodeTime.toFixed(4)}ms for ${SYNC_COUNT} nodes`);
    console.log(`Sync apply: ${applyTime.toFixed(4)}ms for ${SYNC_COUNT} nodes`);

    expect(encodeTime).toBeLessThan(1000);
    expect(applyTime).toBeLessThan(1000);

    const targetNode = graphTarget.get('sync/item-0');
    expect(targetNode).toBeDefined();
  });

  it('measures shard routing hash throughput', () => {
    const ring = createPulseShardRing({ virtualNodes: 150, minReplicas: 3 });
    ring.addRelay('relay-1');
    ring.addRelay('relay-2');
    ring.addRelay('relay-3');

    const report = measureLatencies(() => {
      const index = Math.floor(Math.random() * SHARD_COUNT);
      ring.getShardOwners(`soul-${index}`);
    }, SHARD_COUNT);

    console.log(formatLatencyReport('Shard routing', report));

    expect(report.p50).toBeLessThan(5);
    expect(report.p99).toBeLessThan(20);
  });

  it('measures graph query throughput with prefix scan', () => {
    const graph = createPulseGraph();

    for (let i = 0; i < 500; i++) {
      graph.put(`query/items/${i}`, { value: i, label: `item-${i}` });
    }
    for (let i = 0; i < 100; i++) {
      graph.put(`query/other/${i}`, { value: i });
    }

    const report = measureLatencies(() => {
      graph.query({ prefix: 'query/items/', limit: 50 });
    }, 100);

    console.log(formatLatencyReport('Graph QUERY (prefix scan)', report));

    expect(report.p50).toBeLessThan(50);
    expect(report.p99).toBeLessThan(200);
  });
});

function computeTotalTime(report: LatencyReport, count: number): number {
  return report.p50 * count;
}
