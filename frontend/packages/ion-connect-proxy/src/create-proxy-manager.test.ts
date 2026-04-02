import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProxyManager } from './create-proxy-manager';
import type { ProxyManagerConfig } from './types';

vi.mock('./start-ion-connect-proxy', () => ({
  startIonConnectProxy: vi.fn().mockResolvedValue('OK'),
}));

vi.mock('./stop-ion-connect-proxy', () => ({
  stopIonConnectProxy: vi.fn().mockResolvedValue('OK'),
}));

vi.mock('./native-ion-connect-proxy', () => ({
  getNativeIonConnectProxy: vi.fn().mockReturnValue({
    checkProxy: vi.fn().mockResolvedValue(true),
    proxyRequest: vi.fn().mockResolvedValue('{"status":200,"headers":{},"body":"ok"}'),
    proxyUpload: vi.fn().mockResolvedValue('{"status":200,"headers":{},"body":"ok"}'),
    proxyDownload: vi.fn().mockResolvedValue('{"status":200,"headers":{},"body":""}'),
  }),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn(), addBreadcrumb: vi.fn() },
}));

const { startIonConnectProxy } = await import('./start-ion-connect-proxy');
const { stopIonConnectProxy } = await import('./stop-ion-connect-proxy');

beforeEach(() => vi.clearAllMocks());

function createTestConfig(overrides?: Partial<ProxyManagerConfig>): ProxyManagerConfig {
  return {
    networkStateProvider: {
      isOnline: () => true,
      onNetworkInterfaceChange: () => () => {},
      onStateChange: () => () => {},
      dispose: vi.fn(),
    },
    appStateProvider: {
      getCurrentState: () => 'active',
      onStateChange: () => () => {},
    },
    ...overrides,
  };
}

describe('createProxyManager', () => {
  it('starts proxy and transitions to connected', async () => {
    const manager = createProxyManager(createTestConfig({ port: 9999 }));
    const states: string[] = [];
    manager.onStatusChange((s) => states.push(s));
    await manager.start();
    expect(startIonConnectProxy).toHaveBeenCalledWith(expect.objectContaining({ port: 9999 }));
    expect(manager.getStatus()).toBe('connected');
    expect(states).toEqual(['connecting', 'connected']);
    manager.dispose();
  });

  it('stops proxy and transitions to disconnected', async () => {
    const manager = createProxyManager(createTestConfig());
    await manager.start();
    await manager.stop();
    expect(stopIonConnectProxy).toHaveBeenCalled();
    expect(manager.getStatus()).toBe('disconnected');
    manager.dispose();
  });

  it('creates a resilient transport', async () => {
    const manager = createProxyManager(createTestConfig());
    await manager.start();
    const transport = manager.createTransport();
    expect(transport.request).toBeDefined();
    expect(transport.upload).toBeDefined();
    expect(transport.download).toBeDefined();
    manager.dispose();
  });

  it('creates an HttpClient via createClient', async () => {
    const manager = createProxyManager(createTestConfig());
    await manager.start();
    const client = manager.createClient({ baseUrl: 'http://test.ton' });
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    manager.dispose();
  });

  it('onStatusChange returns unsubscribe function', async () => {
    const manager = createProxyManager(createTestConfig());
    const states: string[] = [];
    const unsub = manager.onStatusChange((s) => states.push(s));
    await manager.start();
    unsub();
    await manager.stop();
    expect(states).toEqual(['connecting', 'connected']);
    manager.dispose();
  });
});
