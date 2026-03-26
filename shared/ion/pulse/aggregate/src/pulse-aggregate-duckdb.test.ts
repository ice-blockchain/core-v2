import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDuckDbAggregate } from './pulse-aggregate-duckdb';
import type {
  PulseAggregateInstance,
  PulseAnalyticsEvent,
} from './types';

function createTestEvent(
  overrides: Partial<PulseAnalyticsEvent>,
): PulseAnalyticsEvent {
  return {
    soul: 'evt-1',
    eventType: 'view',
    timestamp: 1000,
    userId: 'user-1',
    ...overrides,
  };
}

describe('duckdb aggregate', () => {
  let aggregate: PulseAggregateInstance;

  beforeEach(async () => {
    aggregate = await createDuckDbAggregate();
  });

  afterEach(async () => {
    await aggregate.close?.();
  });

  it('stores ingested events in DuckDB', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1' }),
      createTestEvent({ soul: 'e2' }),
    ]);

    expect(await aggregate.getEventCount()).toBe(2);
  });

  it('counts events grouped by eventType', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', eventType: 'view' }),
      createTestEvent({ soul: 'e2', eventType: 'view' }),
      createTestEvent({ soul: 'e3', eventType: 'click' }),
    ]);

    const results = await aggregate.count({
      groupBy: 'eventType',
    });
    const viewResult = results.find((r) => r.group === 'view');
    const clickResult = results.find((r) => r.group === 'click');

    expect(viewResult?.count).toBe(2);
    expect(clickResult?.count).toBe(1);
  });

  it('applies filter in count queries', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', userId: 'alice' }),
      createTestEvent({ soul: 'e2', userId: 'bob' }),
      createTestEvent({ soul: 'e3', userId: 'alice' }),
    ]);

    const results = await aggregate.count({
      groupBy: 'eventType',
      filter: { userId: 'alice' },
    });

    const total = results.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(2);
  });

  it('buckets events correctly in timeSeries', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', timestamp: 100 }),
      createTestEvent({ soul: 'e2', timestamp: 150 }),
      createTestEvent({ soul: 'e3', timestamp: 250 }),
    ]);

    const results = await aggregate.timeSeries({
      bucketSizeMs: 100,
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ bucket: 100, count: 2 });
    expect(results[1]).toEqual({ bucket: 200, count: 1 });
  });

  it('applies filter in timeSeries queries', async () => {
    await aggregate.ingestEvents([
      createTestEvent({
        soul: 'e1',
        timestamp: 100,
        eventType: 'view',
      }),
      createTestEvent({
        soul: 'e2',
        timestamp: 150,
        eventType: 'click',
      }),
      createTestEvent({
        soul: 'e3',
        timestamp: 250,
        eventType: 'view',
      }),
    ]);

    const results = await aggregate.timeSeries({
      bucketSizeMs: 100,
      filter: { eventType: 'view' },
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ bucket: 100, count: 1 });
    expect(results[1]).toEqual({ bucket: 200, count: 1 });
  });

  it('empties database on clear', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1' }),
    ]);

    expect(await aggregate.getEventCount()).toBe(1);
    await aggregate.clear();
    expect(await aggregate.getEventCount()).toBe(0);
  });
});
