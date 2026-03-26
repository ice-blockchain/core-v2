import { describe, it, expect, beforeEach } from 'vitest';
import { createPulseAggregate } from './pulse-aggregate.js';
import type { PulseAggregate, PulseEvent } from './types.js';

function createEvent(overrides: Partial<PulseEvent> = {}): PulseEvent {
  return {
    id: 'evt-1',
    soul: 'soul-1',
    type: 'post',
    timestamp: 1000,
    data: {},
    ...overrides,
  };
}

describe('createPulseAggregate', () => {
  let aggregate: PulseAggregate;

  beforeEach(() => {
    aggregate = createPulseAggregate();
  });

  describe('ingestEvents', () => {
    it('stores ingested events', () => {
      aggregate.ingestEvents([createEvent(), createEvent({ id: 'evt-2' })]);
      expect(aggregate.getEventCount()).toBe(2);
    });

    it('enforces maxEvents by dropping oldest', () => {
      const small = createPulseAggregate({ maxEvents: 3 });
      const events = Array.from({ length: 5 }, (_, i) =>
        createEvent({ id: `evt-${i}`, timestamp: i * 100 }),
      );
      small.ingestEvents(events);

      expect(small.getEventCount()).toBe(3);
      const counts = small.pulseCount({ groupBy: 'id' });
      const ids = counts.map((c) => c.key);
      expect(ids).not.toContain('evt-0');
      expect(ids).not.toContain('evt-1');
    });
  });

  describe('pulseCount', () => {
    it('groups and counts by event field', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', type: 'post' }),
        createEvent({ id: 'e2', type: 'like' }),
        createEvent({ id: 'e3', type: 'post' }),
      ]);

      const results = aggregate.pulseCount({ groupBy: 'type' });
      expect(results).toEqual([
        { key: 'post', count: 2 },
        { key: 'like', count: 1 },
      ]);
    });

    it('groups by data field', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', data: { category: 'music' } }),
        createEvent({ id: 'e2', data: { category: 'music' } }),
        createEvent({ id: 'e3', data: { category: 'art' } }),
      ]);

      const results = aggregate.pulseCount({ groupBy: 'category' });
      expect(results).toEqual([
        { key: 'music', count: 2 },
        { key: 'art', count: 1 },
      ]);
    });

    it('returns results sorted by count descending', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', type: 'a' }),
        createEvent({ id: 'e2', type: 'b' }),
        createEvent({ id: 'e3', type: 'b' }),
        createEvent({ id: 'e4', type: 'c' }),
        createEvent({ id: 'e5', type: 'c' }),
        createEvent({ id: 'e6', type: 'c' }),
      ]);

      const results = aggregate.pulseCount({ groupBy: 'type' });
      expect(results[0]!.key).toBe('c');
      expect(results[1]!.key).toBe('b');
      expect(results[2]!.key).toBe('a');
    });
  });

  describe('pulseTimeSeries', () => {
    it('buckets events by timestamp', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', timestamp: 100 }),
        createEvent({ id: 'e2', timestamp: 150 }),
        createEvent({ id: 'e3', timestamp: 250 }),
        createEvent({ id: 'e4', timestamp: 350 }),
      ]);

      const results = aggregate.pulseTimeSeries({
        bucketMs: 100,
        startTime: 100,
        endTime: 400,
      });

      expect(results).toEqual([
        { bucket: 100, count: 2 },
        { bucket: 200, count: 1 },
        { bucket: 300, count: 1 },
      ]);
    });

    it('returns zero-count buckets within range', () => {
      aggregate.ingestEvents([createEvent({ id: 'e1', timestamp: 100 })]);

      const results = aggregate.pulseTimeSeries({
        bucketMs: 100,
        startTime: 0,
        endTime: 300,
      });

      expect(results).toEqual([
        { bucket: 0, count: 0 },
        { bucket: 100, count: 1 },
        { bucket: 200, count: 0 },
      ]);
    });
  });

  describe('pulseRank', () => {
    it('ranks souls by aggregated score', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', soul: 'alice', data: { points: 10 } }),
        createEvent({ id: 'e2', soul: 'alice', data: { points: 5 } }),
        createEvent({ id: 'e3', soul: 'bob', data: { points: 20 } }),
      ]);

      const results = aggregate.pulseRank({ scoreField: 'points', limit: 10 });
      expect(results).toEqual([
        { soul: 'bob', score: 20, rank: 1 },
        { soul: 'alice', score: 15, rank: 2 },
      ]);
    });

    it('respects limit', () => {
      aggregate.ingestEvents([
        createEvent({ id: 'e1', soul: 'a', data: { points: 30 } }),
        createEvent({ id: 'e2', soul: 'b', data: { points: 20 } }),
        createEvent({ id: 'e3', soul: 'c', data: { points: 10 } }),
      ]);

      const results = aggregate.pulseRank({ scoreField: 'points', limit: 2 });
      expect(results).toHaveLength(2);
      expect(results[0]!.soul).toBe('a');
      expect(results[1]!.soul).toBe('b');
    });
  });

  describe('getEventCount', () => {
    it('returns zero for empty aggregate', () => {
      expect(aggregate.getEventCount()).toBe(0);
    });

    it('returns correct count after ingestion', () => {
      aggregate.ingestEvents([createEvent(), createEvent({ id: 'e2' })]);
      expect(aggregate.getEventCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('empties all events', () => {
      aggregate.ingestEvents([createEvent()]);
      aggregate.clear();
      expect(aggregate.getEventCount()).toBe(0);
    });
  });
});
