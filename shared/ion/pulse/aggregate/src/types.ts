export interface PulseEvent {
  id: string;
  soul: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
  labels?: string[];
}

export interface PulseCountQuery {
  groupBy: string;
  filter?: PulseAggregateFilter;
}

export interface PulseTimeSeriesQuery {
  bucketMs: number;
  startTime: number;
  endTime: number;
  filter?: PulseAggregateFilter;
}

export interface PulseRankQuery {
  scoreField: string;
  limit: number;
  filter?: PulseAggregateFilter;
}

export interface PulseAggregateFilter {
  type?: string;
  labels?: string[];
  startTime?: number;
  endTime?: number;
}

export interface PulseCountResult {
  key: string;
  count: number;
}

export interface PulseTimeSeriesResult {
  bucket: number;
  count: number;
}

export interface PulseRankResult {
  soul: string;
  score: number;
  rank: number;
}

export interface PulseAggregateConfig {
  maxEvents?: number;
}

export interface PulseAggregate {
  ingestEvents(events: PulseEvent[]): void;
  pulseCount(query: PulseCountQuery): PulseCountResult[];
  pulseTimeSeries(query: PulseTimeSeriesQuery): PulseTimeSeriesResult[];
  pulseRank(query: PulseRankQuery): PulseRankResult[];
  getEventCount(): number;
  clear(): void;
  destroy(): void;
}

export interface PulseFederatedResult<T> {
  results: T;
  isPartial: boolean;
  respondedPeers: string[];
  failedPeers: string[];
}
