export { generatePulseEvents, generateRandomUserId } from './data-generator.js';
export { createBenchRunner } from './bench-runner.js';
export { createPulseRelay } from './pulse-relay.js';
export { createPulseClient } from './client-worker.js';
export { runPulseBenchmark } from './bench-orchestrator.js';
export type {
  BenchConfig,
  BenchScenarioResult,
  BenchReport,
  BenchSummary,
  EventType,
  GeneratedEvent,
  GeneratorConfig,
} from './types.js';
export type { BenchRunner } from './bench-runner.js';
export type { PulseRelayInstance, PulseRelayConfig } from './pulse-relay.js';
export type { PulseClient } from './client-worker.js';
