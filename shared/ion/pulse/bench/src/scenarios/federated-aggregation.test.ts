import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInMemoryAggregate } from '../../../aggregate/src/index';
import type {
  PulseAggregateInstance,
  PulseAnalyticsEvent,
  PulseCountResult,
} from '../../../aggregate/src/index';

const BASE_TIMESTAMP = 1700000000000;

function buildEvent(overrides: Partial<PulseAnalyticsEvent>): PulseAnalyticsEvent {
  return {
    soul: overrides.soul ?? 'event/default',
    eventType: overrides.eventType ?? 'view',
    timestamp: overrides.timestamp ?? BASE_TIMESTAMP,
    userId: overrides.userId ?? 'user-1',
    targetId: overrides.targetId,
    value: overrides.value,
    labels: overrides.labels,
  };
}

function mergeCounts(resultSets: PulseCountResult[][]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const results of resultSets) {
    for (const result of results) {
      merged.set(result.group, (merged.get(result.group) ?? 0) + result.count);
    }
  }
  return merged;
}

describe('federated-aggregation', () => {
  let relayAlpha: PulseAggregateInstance;
  let relayBeta: PulseAggregateInstance;
  let relayGamma: PulseAggregateInstance;

  beforeEach(() => {
    relayAlpha = createInMemoryAggregate();
    relayBeta = createInMemoryAggregate();
    relayGamma = createInMemoryAggregate();
  });

  afterEach(async () => {
    await relayAlpha.clear();
    await relayBeta.clear();
    await relayGamma.clear();
  });

  it('counts events locally on each relay', async () => {
    await relayAlpha.ingestEvents([buildEvent({ eventType: 'view' })]);
    await relayBeta.ingestEvents([buildEvent({ eventType: 'view' })]);

    const alphaCount = await relayAlpha.getEventCount();
    const betaCount = await relayBeta.getEventCount();

    expect(alphaCount).toBe(1);
    expect(betaCount).toBe(1);
  });

  it('merges count results from all relays correctly', async () => {
    await relayAlpha.ingestEvents([
      buildEvent({ eventType: 'view', userId: 'alice' }),
      buildEvent({ eventType: 'view', userId: 'alice' }),
    ]);
    await relayBeta.ingestEvents([
      buildEvent({ eventType: 'view', userId: 'bob' }),
    ]);
    await relayGamma.ingestEvents([
      buildEvent({ eventType: 'view', userId: 'alice' }),
      buildEvent({ eventType: 'view', userId: 'charlie' }),
    ]);

    const query = { groupBy: 'userId', filter: { eventType: 'view' } };
    const allCounts = await Promise.all([
      relayAlpha.count(query),
      relayBeta.count(query),
      relayGamma.count(query),
    ]);

    const merged = mergeCounts(allCounts);

    expect(merged.get('alice')).toBe(3);
    expect(merged.get('bob')).toBe(1);
    expect(merged.get('charlie')).toBe(1);
  });

  it('groups by eventType across federated relays', async () => {
    await relayAlpha.ingestEvents([
      buildEvent({ eventType: 'like' }),
      buildEvent({ eventType: 'like' }),
    ]);
    await relayBeta.ingestEvents([
      buildEvent({ eventType: 'share' }),
    ]);
    await relayGamma.ingestEvents([
      buildEvent({ eventType: 'like' }),
      buildEvent({ eventType: 'comment' }),
    ]);

    const query = { groupBy: 'eventType' };
    const allCounts = await Promise.all([
      relayAlpha.count(query),
      relayBeta.count(query),
      relayGamma.count(query),
    ]);

    const merged = mergeCounts(allCounts);

    expect(merged.get('like')).toBe(3);
    expect(merged.get('share')).toBe(1);
    expect(merged.get('comment')).toBe(1);
  });

  it('computes time series buckets across relays', async () => {
    const hour = 3600000;
    await relayAlpha.ingestEvents([
      buildEvent({ timestamp: BASE_TIMESTAMP }),
      buildEvent({ timestamp: BASE_TIMESTAMP + 1000 }),
    ]);
    await relayBeta.ingestEvents([
      buildEvent({ timestamp: BASE_TIMESTAMP + hour }),
    ]);

    const query = { bucketSizeMs: hour };
    const [seriesAlpha, seriesBeta] = await Promise.all([
      relayAlpha.timeSeries(query),
      relayBeta.timeSeries(query),
    ]);

    const bucketMap = new Map<number, number>();
    for (const series of [seriesAlpha, seriesBeta]) {
      for (const entry of series) {
        bucketMap.set(entry.bucket, (bucketMap.get(entry.bucket) ?? 0) + entry.count);
      }
    }

    const totalCount = Array.from(bucketMap.values()).reduce((sum, count) => sum + count, 0);
    expect(totalCount).toBe(3);
    expect(bucketMap.size).toBe(2);
  });

  it('filters events by timestamp range when merging', async () => {
    await relayAlpha.ingestEvents([
      buildEvent({ timestamp: BASE_TIMESTAMP, eventType: 'view' }),
      buildEvent({ timestamp: BASE_TIMESTAMP + 5000, eventType: 'view' }),
    ]);
    await relayBeta.ingestEvents([
      buildEvent({ timestamp: BASE_TIMESTAMP + 10000, eventType: 'view' }),
    ]);

    const query = {
      groupBy: 'eventType',
      filter: { fromTimestamp: BASE_TIMESTAMP + 3000 },
    };

    const allCounts = await Promise.all([
      relayAlpha.count(query),
      relayBeta.count(query),
    ]);

    const merged = mergeCounts(allCounts);
    expect(merged.get('view')).toBe(2);
  });

  it('returns total event count summed across all relays', async () => {
    await relayAlpha.ingestEvents([buildEvent({}), buildEvent({})]);
    await relayBeta.ingestEvents([buildEvent({})]);
    await relayGamma.ingestEvents([buildEvent({}), buildEvent({}), buildEvent({})]);

    const counts = await Promise.all([
      relayAlpha.getEventCount(),
      relayBeta.getEventCount(),
      relayGamma.getEventCount(),
    ]);

    const totalEvents = counts.reduce((sum, count) => sum + count, 0);
    expect(totalEvents).toBe(6);
  });
});
