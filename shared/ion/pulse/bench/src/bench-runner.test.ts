import { describe, it, expect, vi } from 'vitest';
import { createBenchRunner } from './bench-runner.js';
import type { BenchConfig } from './types.js';

const TEST_CONFIG: BenchConfig = {
  relayCount: 1,
  clientCount: 2,
  eventsPerClient: 10,
  shardReplicationFactor: 1,
};

describe('createBenchRunner', () => {
  it('captures passing scenario result', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const result = await runner.runScenario('passing test', async () => {});

    expect(result.name).toBe('passing test');
    expect(result.passed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('captures failing scenario with error message', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const result = await runner.runScenario('failing test', async () => {
      throw new Error('something broke');
    });

    expect(result.name).toBe('failing test');
    expect(result.passed).toBe(false);
    expect(result.error).toBe('something broke');
  });

  it('measures duration of scenario', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const result = await runner.runScenario('timed test', async () => {
      await vi.waitFor(() => {}, { timeout: 50, interval: 50 });
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe('number');
  });

  it('runs multiple scenarios and builds report', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const scenarios = new Map<string, () => Promise<void>>([
      ['scenario-a', async () => {}],
      ['scenario-b', async () => {}],
      ['scenario-c', async () => { throw new Error('fail'); }],
    ]);

    const report = await runner.runAll(scenarios);

    expect(report.results).toHaveLength(3);
    expect(report.config).toEqual(TEST_CONFIG);
    expect(report.startedAt).toBeLessThanOrEqual(report.completedAt);
  });

  it('report summary counts passed and failed correctly', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const scenarios = new Map<string, () => Promise<void>>([
      ['pass-1', async () => {}],
      ['pass-2', async () => {}],
      ['fail-1', async () => { throw new Error('err'); }],
    ]);

    const report = await runner.runAll(scenarios);

    expect(report.summary.total).toBe(3);
    expect(report.summary.passed).toBe(2);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('getReport returns null before any run', () => {
    const runner = createBenchRunner(TEST_CONFIG);
    expect(runner.getReport()).toBeNull();
  });

  it('getReport returns last report after runAll', async () => {
    const runner = createBenchRunner(TEST_CONFIG);
    const scenarios = new Map([['only', async () => {}]]);

    await runner.runAll(scenarios);
    const report = runner.getReport();

    expect(report).not.toBeNull();
    expect(report!.results).toHaveLength(1);
  });
});
