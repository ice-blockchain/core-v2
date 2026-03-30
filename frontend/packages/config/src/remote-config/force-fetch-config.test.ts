import { describe, it, expect, vi } from 'vitest';

import type { HttpClient } from '@ion/network';
import type { IKeyValueStorage } from '@ion/storage';

import { forceFetchConfig } from './force-fetch-config';
import { ConfigErrorCode } from './remote-config-error';
import type { ConfigError } from './remote-config-error';
import type { RemoteConfigDeps, CachedEntry } from './remote-config-types';

function createMockStorage(): IKeyValueStorage {
  const store = new Map<string, unknown>();
  return {
    getString: vi.fn((key: string) => (store.get(key) as string) ?? null),
    setString: vi.fn((key: string, value: string) => { store.set(key, value); }),
    getNumber: vi.fn((key: string) => (store.get(key) as number) ?? null),
    setNumber: vi.fn((key: string, value: number) => { store.set(key, value); }),
    getBoolean: vi.fn(() => null),
    setBoolean: vi.fn(),
    getObject: vi.fn(() => null),
    setObject: vi.fn(),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    hasItem: vi.fn((key: string) => store.has(key)),
    clear: vi.fn(() => { store.clear(); }),
  };
}

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(), post: vi.fn(), put: vi.fn(),
    patch: vi.fn(), delete: vi.fn(), upload: vi.fn(),
  };
}

function createDeps(httpClient: HttpClient): RemoteConfigDeps {
  return {
    httpClient,
    storage: createMockStorage(),

    memoryCache: new Map<string, CachedEntry>(),
  };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };
const identity = { configName: 'cfg', parser, checkVersion: false };

describe('forceFetchConfig', () => {
  it('returns parsed data on successful fetch', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: {}, body: '{"value":1}',
    });

    const result = await forceFetchConfig(createDeps(httpClient), identity);

    expect(result).toEqual({ value: 1 });
  });

  it('sends version=0 to force latest data', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: { 'x-version': '1' }, body: '{"value":1}',
    });

    await forceFetchConfig(createDeps(httpClient), { ...identity, checkVersion: true });

    expect(httpClient.get).toHaveBeenCalledWith(
      '/v1/config/cfg',
      { query: { version: '0' } },
    );
  });

  it('throws CONFIG_NOT_FOUND when server returns 204', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 204, headers: {}, body: '',
    });

    await expect(
      forceFetchConfig(createDeps(httpClient), identity),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_NOT_FOUND });
  });

  it('throws CONFIG_FETCH_FAILED when network fails', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    await expect(
      forceFetchConfig(createDeps(httpClient), identity),
    ).rejects.toSatisfy((error: ConfigError) => {
      expect(error.code).toBe(ConfigErrorCode.CONFIG_FETCH_FAILED);
      expect(error.cause).toBeInstanceOf(Error);
      return true;
    });
  });
});
