import type {
  PulseBenchConfig,
  PulseBenchResult,
  PulseBenchSuite,
} from './types';

const AVAILABLE_SCENARIOS = [
  'shard-routing',
  'cache-behavior',
  'replica-repair',
  'offline-reconciliation',
  'crdt-convergence',
  'federated-aggregation',
  'gdpr-erase',
  'semantic-search',
  'network-chaos',
  'performance',
];

async function executeScenario(
  scenarioName: string,
): Promise<PulseBenchResult> {
  const startTime = Date.now();

  if (!AVAILABLE_SCENARIOS.includes(scenarioName)) {
    return {
      scenario: scenarioName,
      passed: false,
      durationMs: Date.now() - startTime,
      error: `Unknown scenario: ${scenarioName}`,
    };
  }

  // Stub: real Docker integration later
  return {
    scenario: scenarioName,
    passed: true,
    durationMs: Date.now() - startTime,
    metrics: {},
  };
}

export function createPulseBench(
  config?: PulseBenchConfig,
): PulseBenchSuite {
  void config;

  const run = async (
    scenarioName: string,
  ): Promise<PulseBenchResult> => {
    return executeScenario(scenarioName);
  };

  const runAll = async (): Promise<PulseBenchResult[]> => {
    const results: PulseBenchResult[] = [];
    for (const scenario of AVAILABLE_SCENARIOS) {
      const result = await executeScenario(scenario);
      results.push(result);
    }
    return results;
  };

  const getAvailableScenarios = (): string[] => {
    return [...AVAILABLE_SCENARIOS];
  };

  return {
    run,
    runAll,
    getAvailableScenarios,
  };
}
