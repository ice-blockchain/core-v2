import { describe, it, expect } from 'vitest';
import { generatePulseEvents, generateRandomUserId } from './data-generator.js';

describe('generatePulseEvents', () => {
  it('generates correct number of events', () => {
    const events = generatePulseEvents({ userId: 'user-abc', eventCount: 10 });
    expect(events).toHaveLength(10);
  });

  it('all events have valid soul format', () => {
    const events = generatePulseEvents({ userId: 'user-abc', eventCount: 20 });
    const soulPattern = /^(post|message|follow|reaction|media)\/user-abc\/[0-9a-f]{8}$/;

    for (const event of events) {
      expect(event.soul).toMatch(soulPattern);
    }
  });

  it('all events have incrementing timestamps', () => {
    const baseTimestamp = 1000000;
    const events = generatePulseEvents({
      userId: 'user-abc',
      eventCount: 5,
      startTimestamp: baseTimestamp,
    });

    for (let index = 0; index < events.length; index++) {
      expect(events[index]!.timestamp).toBeGreaterThan(baseTimestamp);
      if (index > 0) {
        expect(events[index]!.timestamp).toBeGreaterThan(events[index - 1]!.timestamp);
      }
    }
  });

  it('events have correct type-specific data for posts', () => {
    const events = generatePulseEvents({
      userId: 'user-abc',
      eventCount: 10,
      eventTypes: ['post'],
    });

    for (const event of events) {
      expect(event.type).toBe('post');
      expect(event.data).toHaveProperty('content');
      expect(event.data).toHaveProperty('likes');
      expect(typeof event.data['content']).toBe('string');
      expect(typeof event.data['likes']).toBe('number');
    }
  });

  it('events have correct type-specific data for messages', () => {
    const events = generatePulseEvents({
      userId: 'user-abc',
      eventCount: 10,
      eventTypes: ['message'],
    });

    for (const event of events) {
      expect(event.type).toBe('message');
      expect(event.data).toHaveProperty('content');
      expect(event.data).toHaveProperty('recipientId');
    }
  });

  it('events have correct type-specific data for reactions', () => {
    const events = generatePulseEvents({
      userId: 'user-abc',
      eventCount: 10,
      eventTypes: ['reaction'],
    });

    for (const event of events) {
      expect(event.type).toBe('reaction');
      expect(event.data).toHaveProperty('targetSoul');
      expect(event.data).toHaveProperty('emoji');
    }
  });

  it('respects custom eventTypes filter', () => {
    const events = generatePulseEvents({
      userId: 'user-abc',
      eventCount: 50,
      eventTypes: ['follow', 'media'],
    });

    for (const event of events) {
      expect(['follow', 'media']).toContain(event.type);
    }
  });
});

describe('generateRandomUserId', () => {
  it('returns valid user id format', () => {
    const userId = generateRandomUserId();
    expect(userId).toMatch(/^user-[0-9a-f]{8}$/);
  });

  it('generates unique ids across calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRandomUserId()));
    expect(ids.size).toBeGreaterThan(90);
  });
});
