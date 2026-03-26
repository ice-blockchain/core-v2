export interface PulseAggregateConfig {
  readonly memoryLimitMb?: number;
  readonly useDuckDb?: boolean;
}

export interface PulseAnalyticsEvent {
  readonly soul: string;
  readonly eventType: string;
  readonly timestamp: number;
  readonly userId: string;
  readonly targetId?: string;
  readonly value?: number;
  readonly labels?: string[];
}

export interface PulseCountQuery {
  readonly groupBy: string;
  readonly filter?: PulseEventFilter;
}

export interface PulseEventFilter {
  readonly eventType?: string;
  readonly userId?: string;
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
}

export interface PulseCountResult {
  readonly group: string;
  readonly count: number;
}

export interface PulseTimeSeriesQuery {
  readonly bucketSizeMs: number;
  readonly filter?: PulseEventFilter;
}

export interface PulseTimeSeriesResult {
  readonly bucket: number;
  readonly count: number;
}

export interface PulseAggregateInstance {
  readonly ingestEvents: (
    events: PulseAnalyticsEvent[],
  ) => Promise<void>;
  readonly count: (
    query: PulseCountQuery,
  ) => Promise<PulseCountResult[]>;
  readonly timeSeries: (
    query: PulseTimeSeriesQuery,
  ) => Promise<PulseTimeSeriesResult[]>;
  readonly getEventCount: () => Promise<number>;
  readonly clear: () => Promise<void>;
  readonly close?: () => Promise<void>;
}
