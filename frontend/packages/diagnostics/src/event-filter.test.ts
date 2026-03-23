import { shouldSendToSentry, isTransientNetworkError } from './event-filter';
import { createLogEntry } from './log-entry';
import { LogLevel } from './types';

describe('isTransientNetworkError', () => {
  it('detects common transient network errors', () => {
    expect(isTransientNetworkError('network request failed')).toBe(true);
    expect(isTransientNetworkError('ECONNREFUSED')).toBe(true);
    expect(isTransientNetworkError('timeout exceeded')).toBe(true);
    expect(isTransientNetworkError('socket hang up')).toBe(true);
    expect(isTransientNetworkError('ETIMEDOUT')).toBe(true);
  });

  it('returns false for non-network errors', () => {
    expect(isTransientNetworkError('Invalid input')).toBe(false);
    expect(isTransientNetworkError('User not found')).toBe(false);
    expect(isTransientNetworkError('HTTP 500')).toBe(false);
  });
});

describe('shouldSendToSentry', () => {
  it('always sends fatal entries regardless of message', () => {
    const entry = createLogEntry(LogLevel.Fatal, 'network request failed');
    expect(shouldSendToSentry(entry)).toBe(true);
  });

  it('always sends manually tagged entries', () => {
    const entry = createLogEntry(LogLevel.Error, 'ECONNREFUSED', {
      tag: 'manual_log',
    });
    expect(shouldSendToSentry(entry)).toBe(true);
  });

  it('filters out transient network errors at error level', () => {
    const entry = createLogEntry(LogLevel.Error, 'network request failed');
    expect(shouldSendToSentry(entry)).toBe(false);
  });

  it('filters based on error.message too', () => {
    const entry = createLogEntry(LogLevel.Error, 'Request failed', {
      error: new Error('ECONNREFUSED'),
    });
    expect(shouldSendToSentry(entry)).toBe(false);
  });

  it('sends non-network errors to Sentry', () => {
    const entry = createLogEntry(LogLevel.Error, 'Insufficient balance');
    expect(shouldSendToSentry(entry)).toBe(true);
  });
});
