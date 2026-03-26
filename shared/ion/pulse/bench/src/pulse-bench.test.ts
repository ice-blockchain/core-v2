import { describe, it, expect } from 'vitest';
import { createPulseBench } from './pulse-bench';
import {
  generatePulseTestUser,
  generatePulseTestPost,
  generatePulseTestMessage,
  generatePulseTestEvents,
} from './data-generator';

describe('pulse-bench', () => {
  it('returns available scenarios as a non-empty list', () => {
    const bench = createPulseBench();
    const scenarios = bench.getAvailableScenarios();

    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios).toContain('shard-routing');
    expect(scenarios).toContain('performance');
  });

  it('runs a single scenario and returns a result', async () => {
    const bench = createPulseBench();
    const result = await bench.run('shard-routing');

    expect(result.scenario).toBe('shard-routing');
    expect(result.passed).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error for unknown scenario', async () => {
    const bench = createPulseBench();
    const result = await bench.run('nonexistent');

    expect(result.passed).toBe(false);
    expect(result.error).toContain('Unknown scenario');
  });
});

describe('data-generator', () => {
  it('generates a test user with keys', () => {
    const user = generatePulseTestUser();

    expect(user.userId).toBeDefined();
    expect(user.publicKey).toHaveLength(64);
    expect(user.secretKey).toHaveLength(128);
  });

  it('generates a test post for a given user', () => {
    const post = generatePulseTestPost('user-abc');

    expect(post.userId).toBe('user-abc');
    expect(post.soul).toContain('post-');
    expect(post.eventType).toBe('post');
    expect(post.timestamp).toBeGreaterThan(0);
  });

  it('generates a test message between two users', () => {
    const message = generatePulseTestMessage({
      fromUserId: 'alice',
      toUserId: 'bob',
    });

    expect(message.fromUserId).toBe('alice');
    expect(message.toUserId).toBe('bob');
    expect(message.eventType).toBe('message');
    expect(message.soul).toContain('msg-');
  });

  it('generates the requested number of events', () => {
    const events = generatePulseTestEvents({
      userId: 'user-1',
      count: 15,
    });

    expect(events).toHaveLength(15);
    for (const event of events) {
      expect(event.userId).toBe('user-1');
      expect(event.eventType).toBeDefined();
    }
  });
});
