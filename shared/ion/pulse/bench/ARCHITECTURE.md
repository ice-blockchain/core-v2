# Pulse Bench

Benchmarking harness with scenario runner and realistic event data generator for load testing the Pulse framework.

## API

| Export | Type | Description |
|---|---|---|
| `createBenchRunner` | function | Creates a BenchRunner that executes named scenarios and collects timing |
| `generatePulseEvents` | function | Generate realistic events (post, message, follow, reaction, media) |
| `generateRandomUserId` | function | Generate a random hex-based user ID |
| `BenchRunner` | type | Runner interface: `runScenario`, `runAll`, `getReport` |
| `BenchConfig` | type | `{ relayCount, clientCount, eventsPerClient, shardReplicationFactor }` |
| `BenchScenarioResult` | type | `{ name, passed, durationMs, details?, error? }` |
| `BenchReport` | type | `{ startedAt, completedAt, config, results, summary }` |
| `BenchSummary` | type | `{ total, passed, failed, durationMs }` |
| `GeneratorConfig` | type | `{ userId, eventCount, eventTypes?, startTimestamp? }` |
| `GeneratedEvent` | type | `{ id, type, soul, userId, timestamp, data }` |
| `EventType` | type | `'post' \| 'message' \| 'follow' \| 'reaction' \| 'media'` |

### BenchRunner Interface

| Method | Description |
|---|---|
| `runScenario(name, fn)` | Execute a single scenario; returns pass/fail with duration |
| `runAll(scenarios)` | Execute all scenarios sequentially; returns full BenchReport |
| `getReport()` | Retrieve the last generated report |

### Data Generator

Generates events with incrementing timestamps, soul paths in `{type}/{userId}/{id}` format, and type-specific data payloads (post content with likes, messages with recipients, follows, reactions with emojis, media URLs).

## Dependencies

None. Zero external dependencies. Docker relay cluster support deferred.

## Design Decisions

- Sequential scenario execution -- scenarios run one at a time to avoid resource contention; each gets clean timing
- Pass/fail with error capture -- failed scenarios record the error message without crashing the runner; summary tallies pass/fail counts
- Realistic data shapes -- generated events mirror actual ION event types with plausible field values for meaningful load testing
- Soul path convention -- generated souls follow the `{type}/{userId}/{id}` pattern used by the Graph module, ensuring bench data exercises real code paths
