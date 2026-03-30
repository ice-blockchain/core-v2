import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { HttpClient, RawResponse } from '@ion/network';
import type { IKeyValueStorage } from '@ion/storage';

import { createRemoteConfig } from './create-remote-config';
import { ConfigError, ConfigErrorCode } from './remote-config-error';

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

function okResponse(body: string, headers: Record<string, string> = {}): RawResponse {
  return { status: 200, headers, body };
}

function noContentResponse(): RawResponse {
  return { status: 204, headers: {}, body: '' };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('createRemoteConfig', () => {
  let storage: IKeyValueStorage;
  let httpClient: HttpClient;

  beforeEach(() => {
    storage = createMockStorage();
    httpClient = createMockHttpClient();
  });

  function createService(overrides?: { defaultTimeToLiveMs?: number }) {
    return createRemoteConfig({
      httpClient,
      storage,

      ...overrides,
    });
  }

  function mockGetRaw(): ReturnType<typeof vi.fn> {
    return httpClient.getRaw as ReturnType<typeof vi.fn>;
  }

  it('fetches from network on first call and caches', async () => {
    mockGetRaw().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
    expect(httpClient.getRaw).toHaveBeenCalledTimes(1);
  });

  it('returns cached data on subsequent calls within TTL', async () => {
    mockGetRaw().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
    expect(httpClient.getRaw).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL expires', async () => {
    mockGetRaw()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(okResponse('{"value":2}'));

    const service = createService({ defaultTimeToLiveMs: 0 });

    const first = await service.getConfig({ configName: 'cfg', parser });
    const second = await service.getConfig({ configName: 'cfg', parser });

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
  });

  it('falls back to stale cache when server returns 204', async () => {
    mockGetRaw()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService({ defaultTimeToLiveMs: 0 });

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('falls back to stale cache when network fails', async () => {
    mockGetRaw()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockRejectedValueOnce(new Error('offline'));

    const service = createService({ defaultTimeToLiveMs: 0 });

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('force-fetches when stale cache also unavailable', async () => {
    mockGetRaw()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(okResponse('{"value":99}'));

    const service = createService();
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 99 });
    expect(httpClient.getRaw).toHaveBeenCalledTimes(2);
  });

  it('throws CONFIG_NOT_FOUND when all sources exhausted', async () => {
    mockGetRaw()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService();

    await expect(
      service.getConfig({ configName: 'cfg', parser }),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_NOT_FOUND });
  });

  it('serializes concurrent requests for the same config', async () => {
    let callCount = 0;
    mockGetRaw().mockImplementation(async () => {
      callCount++;
      return okResponse(`{"value":${callCount}}`);
    });

    const service = createService();
    const [a, b] = await Promise.all([
      service.getConfig({ configName: 'cfg', parser }),
      service.getConfig({ configName: 'cfg', parser }),
    ]);

    expect(a).toEqual(b);
    expect(httpClient.getRaw).toHaveBeenCalledTimes(1);
  });

  it('allows concurrent requests for different configs', async () => {
    mockGetRaw().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await Promise.all([
      service.getConfig({ configName: 'a', parser }),
      service.getConfig({ configName: 'b', parser }),
    ]);

    expect(httpClient.getRaw).toHaveBeenCalledTimes(2);
  });

  it('re-throws ConfigError from network fetch', async () => {
    mockGetRaw().mockResolvedValue(okResponse('{"value":1}'));

    const service = createService();
    const badParser = () => { throw new ConfigError(ConfigErrorCode.CONFIG_VERSION_MISSING, 'no version'); };

    await expect(
      service.getConfig({ configName: 'cfg', parser: badParser }),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_VERSION_MISSING });
  });

  it('forces version=0 when cached data fails to parse', async () => {
    storage.setString('remote_config:data:cfg', 'corrupt');
    storage.setNumber('remote_config:version:cfg', 5);
    storage.setNumber('remote_config:timestamp:cfg', Date.now());

    mockGetRaw().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('clearLocks allows re-entry for pending configs', () => {
    const service = createService();
    expect(() => service.clearLocks()).not.toThrow();
  });
});
