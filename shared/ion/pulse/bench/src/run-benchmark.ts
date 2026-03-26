import { runPulseBenchmark } from './bench-orchestrator.js';
import type { BenchReport } from './types.js';

const RELAY_COUNT = 7;
const CLIENT_COUNT = 10;
const EVENTS_PER_CLIENT = 500;
const SHARD_REPLICATION_FACTOR = 3;

async function main(): Promise<void> {
  console.log(`\n=== ION Pulse Benchmark ===`);
  console.log(`Relays: ${RELAY_COUNT} | Clients: ${CLIENT_COUNT} | Events/client: ${EVENTS_PER_CLIENT}\n`);

  const report = await runPulseBenchmark({
    relayCount: RELAY_COUNT,
    clientCount: CLIENT_COUNT,
    eventsPerClient: EVENTS_PER_CLIENT,
    shardReplicationFactor: SHARD_REPLICATION_FACTOR,
  });

  printReport(report);
}

function printReport(report: BenchReport): void {
  console.log(`\n--- Results ---`);
  for (const result of report.results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${result.name}: ${result.durationMs}ms`);
    if (result.error) console.log(`         Error: ${result.error}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Total: ${report.summary.total}`);
  console.log(`  Passed: ${report.summary.passed}`);
  console.log(`  Failed: ${report.summary.failed}`);
  console.log(`  Duration: ${report.summary.durationMs}ms\n`);
}

main().catch(console.error);
