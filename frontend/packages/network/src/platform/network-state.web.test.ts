// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNetworkStateProvider } from './network-state.web';

describe('WebNetworkStateProvider online state', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('reports initial online state', () => {
    const provider = createNetworkStateProvider();
    expect(provider.isOnline()).toBe(true);
    provider.dispose();
  });

  it('updates state on offline event', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    expect(handler).toHaveBeenCalledWith(false);
    expect(provider.isOnline()).toBe(false);
    provider.dispose();
  });

  it('updates state on online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));
    expect(handler).toHaveBeenCalledWith(true);
    provider.dispose();
  });
});

describe('WebNetworkStateProvider dispose', () => {
  it('removes listeners on dispose', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    provider.dispose();
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('WebNetworkStateProvider unsubscribe', () => {
  it('unsubscribes individual handler', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    const unsubscribe = provider.onStateChange(handler);
    unsubscribe();
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    expect(handler).not.toHaveBeenCalled();
    provider.dispose();
  });
});
