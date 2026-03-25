import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNetworkEventEmitter } from './network-event-emitter';

vi.mock('@ion/diagnostics', () => ({
  Logger: {
    warning: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { Logger } from '@ion/diagnostics';

describe('NetworkEventEmitter basic emit', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('emits event to subscribed handler', () => {
    const emitter = createNetworkEventEmitter();
    const handler = vi.fn();
    emitter.on('auth-expired', handler);
    emitter.emit({ type: 'auth-expired' });
    expect(handler).toHaveBeenCalledWith({ type: 'auth-expired' });
  });

  it('emits event with data to handler', () => {
    const emitter = createNetworkEventEmitter();
    const handler = vi.fn();
    emitter.on('online-state-changed', handler);
    emitter.emit({ type: 'online-state-changed', isOnline: true });
    expect(handler).toHaveBeenCalledWith({
      type: 'online-state-changed',
      isOnline: true,
    });
  });

  it('does not call handler for different event type', () => {
    const emitter = createNetworkEventEmitter();
    const handler = vi.fn();
    emitter.on('auth-expired', handler);
    emitter.emit({ type: 'auth-token-refreshed' });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('NetworkEventEmitter multiple handlers', () => {
  it('supports multiple handlers for same event', () => {
    const emitter = createNetworkEventEmitter();
    const first = vi.fn();
    const second = vi.fn();
    emitter.on('auth-expired', first);
    emitter.on('auth-expired', second);
    emitter.emit({ type: 'auth-expired' });
    expect(first).toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  it('does not throw when emitting with no subscribers', () => {
    const emitter = createNetworkEventEmitter();
    expect(() => emitter.emit({ type: 'auth-expired' })).not.toThrow();
  });
});

describe('NetworkEventEmitter unsubscribe', () => {
  it('unsubscribes handler via returned function', () => {
    const emitter = createNetworkEventEmitter();
    const handler = vi.fn();
    const unsubscribe = emitter.on('auth-expired', handler);
    unsubscribe();
    emitter.emit({ type: 'auth-expired' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('reports correct listener count', () => {
    const emitter = createNetworkEventEmitter();
    expect(emitter.listenerCount('auth-expired')).toBe(0);
    const unsub = emitter.on('auth-expired', vi.fn());
    expect(emitter.listenerCount('auth-expired')).toBe(1);
    emitter.on('auth-expired', vi.fn());
    expect(emitter.listenerCount('auth-expired')).toBe(2);
    unsub();
    expect(emitter.listenerCount('auth-expired')).toBe(1);
  });
});

describe('NetworkEventEmitter configuration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exposes custom maxListenersPerEvent', () => {
    const emitter = createNetworkEventEmitter({ maxListenersPerEvent: 100 });
    expect(emitter.maxListenersPerEvent).toBe(100);
  });

  it('defaults maxListenersPerEvent to 50', () => {
    const emitter = createNetworkEventEmitter();
    expect(emitter.maxListenersPerEvent).toBe(50);
  });

  it('logs warning at 80% listener threshold', () => {
    const emitter = createNetworkEventEmitter({ maxListenersPerEvent: 50 });
    for (let i = 0; i < 39; i++) {
      emitter.on('auth-expired', vi.fn());
    }
    expect(Logger.warning).not.toHaveBeenCalled();
    emitter.on('auth-expired', vi.fn());
    expect(Logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('Possible listener leak'),
      expect.objectContaining({ tag: 'network' }),
    );
  });
});
