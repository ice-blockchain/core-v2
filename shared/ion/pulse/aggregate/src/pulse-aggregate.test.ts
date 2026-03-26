import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryAggregate } from './pulse-aggregate';
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

describe('in-memory aggregate', () => {
  let aggregate: PulseAggregateInstance;

  beforeEach(() => {
    aggregate = createInMemoryAggregate();
  });

  it('ingests events and counts by eventType', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', eventType: 'view' }),
      createTestEvent({ soul: 'e2', eventType: 'view' }),
      createTestEvent({ soul: 'e3', eventType: 'click' }),
    ]);

    const results = await aggregate.count({ groupBy: 'eventType' });
    const viewResult = results.find((r) => r.group === 'view');
    const clickResult = results.find((r) => r.group === 'click');

    expect(viewResult?.count).toBe(2);
    expect(clickResult?.count).toBe(1);
  });

  it('applies userId filter in count queries', async () => {
    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', userId: 'alice', eventType: 'view' }),
      createTestEvent({ soul: 'e2', userId: 'bob', eventType: 'view' }),
      createTestEvent({ soul: 'e3', userId: 'alice', eventType: 'click' }),
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

    const results = await aggregate.timeSeries({ bucketSizeMs: 100 });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ bucket: 100, count: 2 });
    expect(results[1]).toEqual({ bucket: 200, count: 1 });
  });

  it('returns correct event count', async () => {
    expect(await aggregate.getEventCount()).toBe(0);

    await aggregate.ingestEvents([
      createTestEvent({ soul: 'e1' }),
      createTestEvent({ soul: 'e2' }),
    ]);

    expect(await aggregate.getEventCount()).toBe(2);
  });

  it('empties store on clear', async () => {
    await aggregate.ingestEvents([createTestEvent({ soul: 'e1' })]);

    expect(await aggregate.getEventCount()).toBe(1);
    await aggregate.clear();
    expect(await aggregate.getEventCount()).toBe(0);
  });
});
