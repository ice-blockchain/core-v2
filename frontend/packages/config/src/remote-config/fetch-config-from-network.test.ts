import { describe, it, expect, vi } from 'vitest';

import type { HttpClient } from '@ion/network';
import type { IKeyValueStorage } from '@ion/storage';

import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
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
    getRaw: vi.fn(),
  };
}

function createDeps(httpClient: HttpClient): RemoteConfigDeps {
  return {
    httpClient,
    storage: createMockStorage(),

    defaultTimeToLiveMs: 60_000,
    memoryCache: new Map<string, CachedEntry>(),
  };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('fetchConfigFromNetwork', () => {
  it('returns parsed data on 200 and saves to cache', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: {}, body: '{"value":42}',
    });
    const deps = createDeps(httpClient);

    const result = await fetchConfigFromNetwork(deps, { configName: 'cfg', parser }, 0);

    expect(result).toEqual({ value: 42 });
    expect(deps.memoryCache.has('cfg')).toBe(true);
    expect(deps.storage.setString).toHaveBeenCalled();
  });

  it('returns null on 204', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 204, headers: {}, body: '',
    });

    const result = await fetchConfigFromNetwork(createDeps(httpClient), { configName: 'cfg', parser }, 5);

    expect(result).toBeNull();
  });

  it('sends version query param when checkVersion is true', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: { 'x-version': '3' }, body: '{"value":1}',
    });

    await fetchConfigFromNetwork(createDeps(httpClient), { configName: 'cfg', parser, checkVersion: true }, 3);

    expect(httpClient.getRaw).toHaveBeenCalledWith(
      '/v1/config/cfg',
      { query: { version: '3' } },
    );
  });

  it('does not send version query param when checkVersion is false', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: {}, body: '{"value":1}',
    });

    await fetchConfigFromNetwork(createDeps(httpClient), { configName: 'cfg', parser }, 0);

    expect(httpClient.getRaw).toHaveBeenCalledWith(
      '/v1/config/cfg',
      { query: undefined },
    );
  });

  it('uses parsed version field when available', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: { 'x-version': '10' }, body: '{"value":1,"version":7}',
    });
    const deps = createDeps(httpClient);
    const versionedParser = (raw: string) => JSON.parse(raw) as { value: number; version: number };

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser: versionedParser, checkVersion: true }, 0);

    expect(deps.memoryCache.get('cfg')!.version).toBe(7);
  });

  it('falls back to x-version header', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: { 'x-version': '10' }, body: '{"value":1}',
    });
    const deps = createDeps(httpClient);

    await fetchConfigFromNetwork(deps, { configName: 'cfg', parser, checkVersion: true }, 0);

    expect(deps.memoryCache.get('cfg')!.version).toBe(10);
  });

  it('throws CONFIG_VERSION_MISSING when checkVersion is true but no version found', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200, headers: {}, body: '{"value":1}',
    });

    await expect(
      fetchConfigFromNetwork(createDeps(httpClient), { configName: 'cfg', parser, checkVersion: true }, 0),
    ).rejects.toThrow(ConfigError);
  });

  it('throws CONFIG_FETCH_FAILED on unexpected status', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.getRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 500, headers: {}, body: 'error',
    });

    await expect(
      fetchConfigFromNetwork(createDeps(httpClient), { configName: 'cfg', parser }, 0),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_FETCH_FAILED });
  });
});
