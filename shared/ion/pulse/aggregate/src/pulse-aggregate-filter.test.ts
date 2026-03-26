import { describe, it, expect } from 'vitest';
import { applyPulseFilter } from './pulse-aggregate-filter.js';
import type { PulseEvent } from './types.js';

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

describe('applyPulseFilter', () => {
  const events: PulseEvent[] = [
    createEvent({ id: 'e1', type: 'post', timestamp: 100, labels: ['social', 'public'] }),
    createEvent({ id: 'e2', type: 'like', timestamp: 200, labels: ['social'] }),
    createEvent({ id: 'e3', type: 'post', timestamp: 300, labels: ['private'] }),
    createEvent({ id: 'e4', type: 'share', timestamp: 400 }),
  ];

  it('returns all events when no filter is provided', () => {
    const result = applyPulseFilter(events);
    expect(result).toHaveLength(4);
  });

  it('filters by type', () => {
    const result = applyPulseFilter(events, { type: 'post' });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.type === 'post')).toBe(true);
  });

  it('filters by labels requiring all specified labels', () => {
    const result = applyPulseFilter(events, { labels: ['social', 'public'] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e1');
  });

  it('excludes events without labels when label filter is set', () => {
    const result = applyPulseFilter(events, { labels: ['social'] });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('filters by time range', () => {
    const result = applyPulseFilter(events, { startTime: 150, endTime: 350 });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['e2', 'e3']);
  });

  it('applies combined filters', () => {
    const result = applyPulseFilter(events, {
      type: 'post',
      startTime: 0,
      endTime: 200,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e1');
  });

  it('returns empty array when no events match', () => {
    const result = applyPulseFilter(events, { type: 'nonexistent' });
    expect(result).toHaveLength(0);
  });
});
