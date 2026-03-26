import { describe, it, expect, vi } from 'vitest';
import { createPulseSignal } from './pulse-signal';

describe('createPulseSignal', () => {
  it('delivers notifications to subscribers', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/alice', callback);
    signal.notify('users/alice', { name: 'Alice' });

    expect(callback).toHaveBeenCalledWith('users/alice', { name: 'Alice' });
  });

  it('stops notifications after unsubscribe', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    const unsubscribe = signal.subscribe('users/bob', callback);
    unsubscribe();
    signal.notify('users/bob', { name: 'Bob' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('matches wildcard patterns', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/*', callback);
    signal.notify('users/alice', { name: 'Alice' });
    signal.notify('users/bob', { name: 'Bob' });
    signal.notify('posts/1', { title: 'Hello' });

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('users/alice', { name: 'Alice' });
    expect(callback).toHaveBeenCalledWith('users/bob', { name: 'Bob' });
  });

  it('clears all subscriptions on destroy', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/alice', callback);
    signal.destroy();
    signal.notify('users/alice', { name: 'Alice' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('reports correct subscriber count', () => {
    const signal = createPulseSignal();
    const callbackA = vi.fn();
    const callbackB = vi.fn();

    expect(signal.getSubscriberCount('users/alice')).toBe(0);

    signal.subscribe('users/alice', callbackA);
    expect(signal.getSubscriberCount('users/alice')).toBe(1);

    signal.subscribe('users/alice', callbackB);
    expect(signal.getSubscriberCount('users/alice')).toBe(2);
  });

  it('does not match non-wildcard paths partially', () => {
    const signal = createPulseSignal();
    const callback = vi.fn();

    signal.subscribe('users/alice', callback);
    signal.notify('users/alice/posts', { id: 1 });

    expect(callback).not.toHaveBeenCalled();
  });
});
