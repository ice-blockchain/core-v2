import { describe, it, expect, vi } from 'vitest';

import { forceFetchConfig } from './force-fetch-config';
import { ConfigErrorCode } from './remote-config-error';
import type { ConfigError } from './remote-config-error';
import type { RemoteConfigDeps, CachedEntry, ConfigStorage, ConfigHttpClient } from './remote-config-types';

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

describe('forceFetchConfig', () => {
  it('returns parsed data on successful fetch', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({ status: 200, headers: {}, body: '{"value":1}' }),
    };

    const result = await forceFetchConfig(createDeps(httpClient), { configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('sends version=0 to force latest data', async () => {
    const get = vi.fn().mockResolvedValue({ status: 200, headers: { 'x-version': '1' }, body: '{"value":1}' });
    const deps = createDeps({ get });

    await forceFetchConfig(deps, { configName: 'cfg', parser, checkVersion: true });

    expect(get).toHaveBeenCalledWith(
      'https://api.example.com/v1/config/cfg',
      { query: { version: '0' } },
    );
  });

  it('throws CONFIG_NOT_FOUND when server returns 204', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockResolvedValue({ status: 204, headers: {}, body: '' }),
    };

    await expect(
      forceFetchConfig(createDeps(httpClient), { configName: 'cfg', parser }),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_NOT_FOUND });
  });

  it('throws CONFIG_FETCH_FAILED when network fails', async () => {
    const httpClient: ConfigHttpClient = {
      get: vi.fn().mockRejectedValue(new Error('offline')),
    };

    await expect(
      forceFetchConfig(createDeps(httpClient), { configName: 'cfg', parser }),
    ).rejects.toSatisfy((error: ConfigError) => {
      expect(error.code).toBe(ConfigErrorCode.CONFIG_FETCH_FAILED);
      expect(error.cause).toBeInstanceOf(Error);
      return true;
    });
  });
});
