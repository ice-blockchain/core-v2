import type {
  PulseAggregateConfig,
  PulseAggregateInstance,
  PulseAnalyticsEvent,
  PulseCountQuery,
  PulseCountResult,
  PulseEventFilter,
  PulseTimeSeriesQuery,
  PulseTimeSeriesResult,
} from './types';

export function matchesFilter(
  event: PulseAnalyticsEvent,
  filter?: PulseEventFilter,
): boolean {
  if (!filter) return true;
  if (filter.eventType && event.eventType !== filter.eventType) {
    return false;
  }
  if (filter.userId && event.userId !== filter.userId) {
    return false;
  }
  if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
    return false;
  }
  if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
    return false;
  }
  return true;
}

function extractGroupValue(
  event: PulseAnalyticsEvent,
  groupBy: string,
): string | undefined {
  const value = event[groupBy as keyof PulseAnalyticsEvent];
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function computeGroupCounts(
  events: PulseAnalyticsEvent[],
  query: PulseCountQuery,
): PulseCountResult[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (!matchesFilter(event, query.filter)) continue;
    const group = extractGroupValue(event, query.groupBy);
    if (group === undefined) continue;
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([group, count]) => ({
    group,
    count,
  }));
}

function computeTimeSeries(
  events: PulseAnalyticsEvent[],
  query: PulseTimeSeriesQuery,
): PulseTimeSeriesResult[] {
  const buckets = new Map<number, number>();

  for (const event of events) {
    if (!matchesFilter(event, query.filter)) continue;
    const bucket =
      Math.floor(event.timestamp / query.bucketSizeMs) *
      query.bucketSizeMs;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket - b.bucket);
}

export function createInMemoryAggregate(): PulseAggregateInstance {
  const events: PulseAnalyticsEvent[] = [];

  return {
    ingestEvents: async (newEvents) => {
      events.push(...newEvents);
    },
    count: async (query) => {
      return computeGroupCounts(events, query);
    },
    timeSeries: async (query) => {
      return computeTimeSeries(events, query);
    },
    getEventCount: async () => events.length,
    clear: async () => {
      events.length = 0;
    },
  };
}

export async function createPulseAggregate(
  config?: PulseAggregateConfig,
): Promise<PulseAggregateInstance> {
  if (config?.useDuckDb) {
    const { createDuckDbAggregate } = await import(
      './pulse-aggregate-duckdb'
    );
    return createDuckDbAggregate();
  }
  return createInMemoryAggregate();
}
