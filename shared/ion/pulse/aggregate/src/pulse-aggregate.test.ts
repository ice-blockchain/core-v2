import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseAggregate } from './pulse-aggregate';
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

describe('pulse-aggregate', () => {
  let aggregate: PulseAggregateInstance;

  beforeEach(() => {
    aggregate = createPulseAggregate();
  });

  it('ingests events and counts by eventType', () => {
    aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', eventType: 'view' }),
      createTestEvent({ soul: 'e2', eventType: 'view' }),
      createTestEvent({ soul: 'e3', eventType: 'click' }),
    ]);

    const results = aggregate.count({ groupBy: 'eventType' });
    const viewResult = results.find((r) => r.group === 'view');
    const clickResult = results.find((r) => r.group === 'click');

    expect(viewResult?.count).toBe(2);
    expect(clickResult?.count).toBe(1);
  });

  it('applies userId filter in count queries', () => {
    aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', userId: 'alice', eventType: 'view' }),
      createTestEvent({ soul: 'e2', userId: 'bob', eventType: 'view' }),
      createTestEvent({ soul: 'e3', userId: 'alice', eventType: 'click' }),
    ]);

    const results = aggregate.count({
      groupBy: 'eventType',
      filter: { userId: 'alice' },
    });

    const total = results.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(2);
  });

  it('buckets events correctly in timeSeries', () => {
    aggregate.ingestEvents([
      createTestEvent({ soul: 'e1', timestamp: 100 }),
      createTestEvent({ soul: 'e2', timestamp: 150 }),
      createTestEvent({ soul: 'e3', timestamp: 250 }),
    ]);

    const results = aggregate.timeSeries({ bucketSizeMs: 100 });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ bucket: 100, count: 2 });
    expect(results[1]).toEqual({ bucket: 200, count: 1 });
  });

  it('returns correct event count from getEventCount', () => {
    expect(aggregate.getEventCount()).toBe(0);

    aggregate.ingestEvents([
      createTestEvent({ soul: 'e1' }),
      createTestEvent({ soul: 'e2' }),
    ]);

    expect(aggregate.getEventCount()).toBe(2);
  });

  it('empties store on clear', () => {
    aggregate.ingestEvents([
      createTestEvent({ soul: 'e1' }),
    ]);

    expect(aggregate.getEventCount()).toBe(1);
    aggregate.clear();
    expect(aggregate.getEventCount()).toBe(0);
  });
});
