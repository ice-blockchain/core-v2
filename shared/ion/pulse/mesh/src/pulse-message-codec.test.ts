import { describe, it, expect } from 'vitest';
import { encodePulseMessage, decodePulseMessage } from './pulse-message-codec.js';
import type { PulseMessage, PulseMessageType } from './types.js';

function createTestMessage(overrides: Partial<PulseMessage> = {}): PulseMessage {
  return {
    type: 'sync-step1',
    topic: 'test-topic',
    data: new Uint8Array([1, 2, 3]),
    ...overrides,
  };
}

describe('pulse-message-codec', () => {
  describe('round-trip encoding', () => {
    const messageTypes: PulseMessageType[] = ['sync-step1', 'sync-step2', 'awareness', 'erasure'];

    it.each(messageTypes)('round-trips %s message type', (type) => {
      const original = createTestMessage({ type });
      const encoded = encodePulseMessage(original);
      const decoded = decodePulseMessage(encoded);

      expect(decoded.type).toBe(original.type);
      expect(decoded.topic).toBe(original.topic);
      expect(decoded.data).toEqual(original.data);
    });
  });

  describe('edge cases', () => {
    it('handles empty data', () => {
      const original = createTestMessage({ data: new Uint8Array(0) });
      const decoded = decodePulseMessage(encodePulseMessage(original));

      expect(decoded.data).toEqual(new Uint8Array(0));
      expect(decoded.topic).toBe('test-topic');
    });

    it('handles large data payload', () => {
      const largeData = new Uint8Array(10_000);
      largeData.fill(42);
      const original = createTestMessage({ data: largeData });

      const decoded = decodePulseMessage(encodePulseMessage(original));

      expect(decoded.data).toEqual(largeData);
      expect(decoded.data.length).toBe(10_000);
    });

    it('preserves topic string with special characters', () => {
      const original = createTestMessage({ topic: 'doc/abc-123/sync' });
      const decoded = decodePulseMessage(encodePulseMessage(original));

      expect(decoded.topic).toBe('doc/abc-123/sync');
    });

    it('preserves empty topic', () => {
      const original = createTestMessage({ topic: '' });
      const decoded = decodePulseMessage(encodePulseMessage(original));

      expect(decoded.topic).toBe('');
    });

    it('preserves unicode topic', () => {
      const original = createTestMessage({ topic: 'topic-with-emoji-data' });
      const decoded = decodePulseMessage(encodePulseMessage(original));

      expect(decoded.topic).toBe('topic-with-emoji-data');
    });
  });

  describe('error handling', () => {
    it('throws on bytes too short for header', () => {
      expect(() => decodePulseMessage(new Uint8Array([0, 1]))).toThrow('too short');
    });

    it('throws on invalid message type byte', () => {
      expect(() => decodePulseMessage(new Uint8Array([99, 0, 0]))).toThrow('Invalid message type');
    });

    it('throws on truncated topic', () => {
      const bytes = new Uint8Array([0, 0, 10, 65]);
      expect(() => decodePulseMessage(bytes)).toThrow('truncated topic');
    });
  });
});
