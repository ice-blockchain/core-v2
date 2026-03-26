import type { BenchConfig, BenchReport, BenchScenarioResult, BenchSummary } from './types.js';

export interface BenchRunner {
  runScenario(name: string, scenarioFn: () => Promise<void>): Promise<BenchScenarioResult>;
  runAll(scenarios: Map<string, () => Promise<void>>): Promise<BenchReport>;
  getReport(): BenchReport | null;
}

export function createBenchRunner(config: BenchConfig): BenchRunner {
  let lastReport: BenchReport | null = null;

  return {
    runScenario: (name, scenarioFn) => executeScenario(name, scenarioFn),
    runAll: async (scenarios) => {
      lastReport = await executeAllScenarios(config, scenarios);
      return lastReport;
    },
    getReport: () => lastReport,
  };
}

async function executeScenario(
  name: string,
  scenarioFn: () => Promise<void>,
): Promise<BenchScenarioResult> {
  const startTime = Date.now();

  try {
    await scenarioFn();
    return buildPassingResult(name, startTime);
  } catch (error) {
    return buildFailingResult(name, startTime, error);
  }
}

function buildPassingResult(name: string, startTime: number): BenchScenarioResult {
  return { name, passed: true, durationMs: Date.now() - startTime };
}

function buildFailingResult(
  name: string,
  startTime: number,
  error: unknown,
): BenchScenarioResult {
  const message = error instanceof Error ? error.message : String(error);
  return { name, passed: false, durationMs: Date.now() - startTime, error: message };
}

async function executeAllScenarios(
  config: BenchConfig,
  scenarios: Map<string, () => Promise<void>>,
): Promise<BenchReport> {
  const startedAt = Date.now();
  const results: BenchScenarioResult[] = [];

  for (const [name, scenarioFn] of scenarios) {
    const result = await executeScenario(name, scenarioFn);
    results.push(result);
  }

  return buildReport({ config, startedAt, results });
}

interface ReportInput {
  config: BenchConfig;
  startedAt: number;
  results: BenchScenarioResult[];
}

function buildReport(input: ReportInput): BenchReport {
  const completedAt = Date.now();

  return {
    startedAt: input.startedAt,
    completedAt,
    config: input.config,
    results: input.results,
    summary: buildSummary(input.results, completedAt - input.startedAt),
  };
}

function buildSummary(results: BenchScenarioResult[], durationMs: number): BenchSummary {
  const passed = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    durationMs,
  };
}
