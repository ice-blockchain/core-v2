import { describe, it, expect, vi } from 'vitest';

import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type {
  RemoteConfigDeps,
  CachedEntry,
  ConfigStorage,
  ConfigHttpClient,
} from './remote-config-types';

function createMockStorage(): ConfigStorage {
  const store = new Map<string, string | number>();
  return {
    getString: vi.fn((key: string) => (store.get(key) as string) ?? null),
    setString: vi.fn((key: string, value: string) => store.set(key, value)),
    getNumber: vi.fn((key: string) => (store.get(key) as number) ?? null),
    setNumber: vi.fn((key: string, value: number) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
  };
}

function createDeps(httpClient: ConfigHttpClient): RemoteConfigDeps {
  return {
    httpClient,
    storage: createMockStorage(),
    baseUrl: 'https://api.example.com',
    defaultTimeToLiveMs: 60_000,
    memoryCache: new Map<string, CachedEntry>(),
  };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('fetchConfigFromNetwork', () => {
  it('returns parsed data on 200 and saves to cache', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: '{"value":42}',
      }),
    };
    const deps = createDeps(httpClient);

    const result = await fetchConfigFromNetwork(deps, { configName: 'cfg', parser }, 0);

    expect(result).toEqual({ value: 42 });
    expect(deps.memoryCache.has('cfg')).toBe(true);
    expect(deps.storage.setString).toHaveBeenCalled();
  });

  it('returns null on 204', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({ status: 204, headers: {}, body: '' }),
    };
    const deps = createDeps(httpClient);

    const result = await fetchConfigFromNetwork(deps, { configName: 'cfg', parser }, 5);

    expect(result).toBeNull();
  });

  it('sends version query param when checkVersion is true', async () => {
    const get = vi.fn().mockResolvedValue({
      status: 200,
      headers: { 'x-version': '3' },
      body: '{"value":1}',
    });
    const deps = createDeps({ get });

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser, checkVersion: true }, 3);

    expect(get).toHaveBeenCalledWith(
      'https://api.example.com/v1/config/cfg',
      { query: { version: '3' } },
    );
  });

  it('does not send version query param when checkVersion is false', async () => {
    const get = vi.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: '{"value":1}',
    });
    const deps = createDeps({ get });

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser }, 0);

    expect(get).toHaveBeenCalledWith(
      'https://api.example.com/v1/config/cfg',
      { query: undefined },
    );
  });

  it('uses parsed version field when available', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({
        status: 200,
        headers: { 'x-version': '10' },
        body: '{"value":1,"version":7}',
      }),
    };
    const deps = createDeps(httpClient);
    const versionedParser = (raw: string) => JSON.parse(raw) as { value: number; version: number };

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser: versionedParser, checkVersion: true }, 0);

    const cached = deps.memoryCache.get('cfg');
    expect(cached!.version).toBe(7);
  });

  it('falls back to x-version header', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({
        status: 200,
        headers: { 'x-version': '10' },
        body: '{"value":1}',
      }),
    };
    const deps = createDeps(httpClient);

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser, checkVersion: true }, 0);

    const cached = deps.memoryCache.get('cfg');
    expect(cached!.version).toBe(10);
  });

  it('throws CONFIG_VERSION_MISSING when checkVersion is true but no version found', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({
        status: 200,
        headers: {},
        body: '{"value":1}',
      }),
    };
    const deps = createDeps(httpClient);

    await expect(
      fetchConfigFromNetwork(deps, { configName: 'cfg', parser, checkVersion: true }, 0),
    ).rejects.toThrow(ConfigError);
  });

  it('throws CONFIG_FETCH_FAILED on unexpected status', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({ status: 500, headers: {}, body: 'error' }),
    };
    const deps = createDeps(httpClient);

    await expect(
      fetchConfigFromNetwork(deps, { configName: 'cfg', parser }, 0),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_FETCH_FAILED });
  });
});
