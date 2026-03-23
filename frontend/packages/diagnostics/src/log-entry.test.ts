import { createLogEntry } from './log-entry';
import { LogLevel } from './types';

describe('createLogEntry with required fields', () => {
  it('creates entry with level and message only', () => {
    const entry = createLogEntry(LogLevel.Info, 'test message');

    expect(entry.level).toBe(LogLevel.Info);
    expect(entry.message).toBe('test message');
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.tag).toBeUndefined();
    expect(entry.data).toBeUndefined();
    expect(entry.error).toBeUndefined();
  });

  it('sets timestamp close to current time', () => {
    const before = Date.now();
    const entry = createLogEntry(LogLevel.Debug, 'timing');
    const after = Date.now();

    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('createLogEntry with options', () => {
  it('includes tag and data when provided', () => {
    const entry = createLogEntry(LogLevel.Warning, 'warn', {
      tag: 'wallet',
      data: { amount: 100 },
    });

    expect(entry.tag).toBe('wallet');
    expect(entry.data).toEqual({ amount: 100 });
  });

  it('includes error when provided', () => {
    const error = new Error('something broke');
    const entry = createLogEntry(LogLevel.Error, 'failure', { error });

    expect(entry.error).toBe(error);
  });
});
