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
    const bucket = Math.floor(
      event.timestamp / query.bucketSizeMs,
    ) * query.bucketSizeMs;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket - b.bucket);
}

export function createPulseAggregate(
  config?: PulseAggregateConfig,
): PulseAggregateInstance {
  const events: PulseAnalyticsEvent[] = [];
  void config;

  const ingestEvents = (
    newEvents: PulseAnalyticsEvent[],
  ): void => {
    events.push(...newEvents);
  };

  const count = (query: PulseCountQuery): PulseCountResult[] => {
    return computeGroupCounts(events, query);
  };

  const timeSeries = (
    query: PulseTimeSeriesQuery,
  ): PulseTimeSeriesResult[] => {
    return computeTimeSeries(events, query);
  };

  const getEventCount = (): number => events.length;

  const clear = (): void => {
    events.length = 0;
  };

  return {
    ingestEvents,
    count,
    timeSeries,
    getEventCount,
    clear,
  };
}
