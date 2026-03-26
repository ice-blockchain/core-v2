import { describe, it, expect, vi } from 'vitest';
import { createPulseSignal } from './pulse-signal';

describe('createPulseSignal', () => {
  it('fires callback on exact path match', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/alice', callback);
    signal.emit('users/alice', { name: 'Alice' });

    expect(callback).toHaveBeenCalledWith({ name: 'Alice' }, 'users/alice');
    signal.destroy();
  });

  it('matches single-level wildcard', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/*', callback);
    signal.emit('users/alice', 'a');
    signal.emit('users/bob', 'b');
    signal.emit('users/alice/posts', 'nested');

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('a', 'users/alice');
    expect(callback).toHaveBeenCalledWith('b', 'users/bob');
    signal.destroy();
  });

  it('matches deep wildcard across multiple levels', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/**', callback);
    signal.emit('users/alice', 1);
    signal.emit('users/alice/posts', 2);
    signal.emit('users/alice/posts/123', 3);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(1, 'users/alice');
    expect(callback).toHaveBeenCalledWith(2, 'users/alice/posts');
    expect(callback).toHaveBeenCalledWith(3, 'users/alice/posts/123');
    signal.destroy();
  });

  it('removes callback on unsubscribe', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    const unsubscribe = signal.subscribe('events/click', callback);
    signal.emit('events/click', 'first');
    unsubscribe();
    signal.emit('events/click', 'second');

    expect(callback).toHaveBeenCalledTimes(1);
    signal.destroy();
  });

  it('fires all subscribers on same path', () => {
    const signal = createPulseSignal();
    const callbackA = vi.fn();
    const callbackB = vi.fn();

    signal.subscribe('shared/path', callbackA);
    signal.subscribe('shared/path', callbackB);
    signal.emit('shared/path', 'data');

    expect(callbackA).toHaveBeenCalledWith('data', 'shared/path');
    expect(callbackB).toHaveBeenCalledWith('data', 'shared/path');
    signal.destroy();
  });

  it('clears all subscriptions on destroy', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('a', callback);
    signal.subscribe('b', callback);
    signal.destroy();
    signal.emit('a', 1);
    signal.emit('b', 2);

    expect(callback).not.toHaveBeenCalled();
    expect(signal.listSubscriptions()).toEqual([]);
  });

  it('returns correct subscriber count', () => {
    const signal = createPulseSignal();
    const callbackA = vi.fn();
    const callbackB = vi.fn();

    expect(signal.subscriberCount('path')).toBe(0);

    signal.subscribe('path', callbackA);
    expect(signal.subscriberCount('path')).toBe(1);

    signal.subscribe('path', callbackB);
    expect(signal.subscriberCount('path')).toBe(2);

    signal.destroy();
  });
});
