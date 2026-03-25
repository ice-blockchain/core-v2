import { describe, it, expect, vi, beforeEach } from 'vitest';
import Module from 'node:module';

let netInfoListener: ((state: { isConnected: boolean | null; type: string }) => void) | null = null;
const mockUnsubscribe = vi.fn();

const mockNetInfo = {
  addEventListener: (listener: (state: { isConnected: boolean | null; type: string }) => void) => {
    netInfoListener = listener;
    return mockUnsubscribe;
  },
  fetch: vi.fn().mockResolvedValue({ isConnected: true, type: 'wifi' }),
};

type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const resolveFilename = (Module as unknown as { _resolveFilename: ResolveFilename })._resolveFilename;
(Module as unknown as { _resolveFilename: ResolveFilename })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request === '@react-native-community/netinfo') return request;
  return resolveFilename.call(this, request, ...rest);
};

require.cache['@react-native-community/netinfo'] = {
  id: '@react-native-community/netinfo',
  filename: '@react-native-community/netinfo',
  loaded: true,
  exports: mockNetInfo,
  children: [],
  paths: [],
  path: '',
  isPreloading: false,
  require,
} as unknown as NodeModule;

import { createNetworkStateProvider } from './network-state.native';

describe('NativeNetworkStateProvider initial state', () => {
  beforeEach(() => { netInfoListener = null; mockUnsubscribe.mockClear(); });

  it('reports initial online state as true', () => {
    const provider = createNetworkStateProvider();
    expect(provider.isOnline()).toBe(true);
    provider.dispose();
  });
});

describe('NativeNetworkStateProvider state changes', () => {
  beforeEach(() => { netInfoListener = null; mockUnsubscribe.mockClear(); });

  it('fires onStateChange when connectivity changes', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    netInfoListener!({ isConnected: false, type: 'none' });
    expect(handler).toHaveBeenCalledWith(false);
    expect(provider.isOnline()).toBe(false);
    provider.dispose();
  });

  it('treats isConnected null as offline', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    netInfoListener!({ isConnected: null, type: 'unknown' });
    expect(handler).toHaveBeenCalledWith(false);
    expect(provider.isOnline()).toBe(false);
    provider.dispose();
  });

  it('does not fire handler when state unchanged', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onStateChange(handler);
    netInfoListener!({ isConnected: true, type: 'wifi' });
    expect(handler).not.toHaveBeenCalled();
    provider.dispose();
  });
});

describe('NativeNetworkStateProvider interface changes', () => {
  beforeEach(() => { netInfoListener = null; mockUnsubscribe.mockClear(); });

  it('fires onNetworkInterfaceChange when connection type changes', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    provider.onNetworkInterfaceChange(handler);
    netInfoListener!({ isConnected: true, type: 'wifi' });
    netInfoListener!({ isConnected: true, type: 'cellular' });
    expect(handler).toHaveBeenCalledTimes(1);
    provider.dispose();
  });
});

describe('NativeNetworkStateProvider cleanup', () => {
  beforeEach(() => { netInfoListener = null; mockUnsubscribe.mockClear(); });

  it('cleans up NetInfo subscription on dispose', () => {
    const provider = createNetworkStateProvider();
    provider.dispose();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('unsubscribes individual handler', () => {
    const provider = createNetworkStateProvider();
    const handler = vi.fn();
    const unsubscribe = provider.onStateChange(handler);
    unsubscribe();
    netInfoListener!({ isConnected: false, type: 'none' });
    expect(handler).not.toHaveBeenCalled();
    provider.dispose();
  });
});
