export interface PulseBenchConfig {
  readonly relayCount?: number;
  readonly clientCount?: number;
  readonly eventsPerClient?: number;
  readonly replicationFactor?: number;
}

export interface PulseBenchResult {
  readonly scenario: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly metrics?: Record<string, number>;
  readonly error?: string;
}

export interface PulseBenchSuite {
  readonly run: (scenarioName: string) => Promise<PulseBenchResult>;
  readonly runAll: () => Promise<PulseBenchResult[]>;
  readonly getAvailableScenarios: () => string[];
}
