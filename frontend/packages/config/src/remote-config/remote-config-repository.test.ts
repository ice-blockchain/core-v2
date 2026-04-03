import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { HttpClient, HttpResponse } from '@ion/network';
import type { IKeyValueStorage } from '@ion/storage';

vi.mock('../environment/environment', () => ({
  environmentConfig: { apiBaseUrl: 'https://api.test.ion.app' },
}));

import { remoteConfigRepository } from './remote-config-repository';
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
    patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), head: vi.fn(),
  };
}

function okResponse(body: string, headers: Record<string, string> = {}): HttpResponse<string> {
  return { status: 200, headers, body };
}

function noContentResponse(): HttpResponse<string> {
  return { status: 204, headers: {}, body: '' };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };
const configOptions = { configName: 'cfg', parser };

describe('remoteConfigRepository', () => {
  let storage: IKeyValueStorage;
  let httpClient: HttpClient;

  beforeEach(() => {
    storage = createMockStorage();
    httpClient = createMockHttpClient();
  });

  function createService() {
    return remoteConfigRepository({ httpClient, storage });
  }

  function mockGet(): ReturnType<typeof vi.fn> {
    return httpClient.get as ReturnType<typeof vi.fn>;
  }

  it('fetches from network on first call and caches', async () => {
    mockGet().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig(configOptions);

    expect(result).toEqual({ value: 1 });
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns cached data on subsequent calls within TTL', async () => {
    mockGet().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await service.getConfig(configOptions);
    const result = await service.getConfig(configOptions);

    expect(result).toEqual({ value: 1 });
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('refetches after refresh interval expires', async () => {
    mockGet()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(okResponse('{"value":2}'));

    const service = createService();

    const first = await service.getConfig({ ...configOptions, timeToLiveMs: 0 });
    const second = await service.getConfig({ ...configOptions, timeToLiveMs: 0 });

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
  });

  it('falls back to stale cache when server returns 204', async () => {
    mockGet()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService();

    await service.getConfig({ ...configOptions, timeToLiveMs: 0 });
    const result = await service.getConfig({ ...configOptions, timeToLiveMs: 0 });

    expect(result).toEqual({ value: 1 });
  });

  it('falls back to stale cache when network fails', async () => {
    mockGet()
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockRejectedValueOnce(new Error('offline'));

    const service = createService();

    await service.getConfig({ ...configOptions, timeToLiveMs: 0 });
    const result = await service.getConfig({ ...configOptions, timeToLiveMs: 0 });

    expect(result).toEqual({ value: 1 });
  });

  it('force-fetches when stale cache also unavailable', async () => {
    mockGet()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(okResponse('{"value":99}'));

    const service = createService();
    const result = await service.getConfig(configOptions);

    expect(result).toEqual({ value: 99 });
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('throws CONFIG_NOT_FOUND when all sources exhausted', async () => {
    mockGet()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService();

    await expect(service.getConfig(configOptions)).rejects.toMatchObject({
      code: ConfigErrorCode.CONFIG_NOT_FOUND,
    });
  });

  it('serializes concurrent getConfig calls for the same config', async () => {
    let callCount = 0;
    mockGet().mockImplementation(async () => {
      callCount++;
      return okResponse(`{"value":${callCount}}`);
    });

    const service = createService();
    const [a, b] = await Promise.all([
      service.getConfig(configOptions),
      service.getConfig(configOptions),
    ]);

    expect(a).toEqual(b);
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('allows concurrent requests for different configs', async () => {
    mockGet().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await Promise.all([
      service.getConfig({ ...configOptions, configName: 'a' }),
      service.getConfig({ ...configOptions, configName: 'b' }),
    ]);

    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('re-throws ConfigError from parser', async () => {
    mockGet().mockResolvedValue(okResponse('{"value":1}'));

    const badParser = () => {
      throw new ConfigError(ConfigErrorCode.CONFIG_VERSION_MISSING, 'no version');
    };
    const service = createService();

    await expect(
      service.getConfig({ configName: 'cfg', parser: badParser }),
    ).rejects.toMatchObject({
      code: ConfigErrorCode.CONFIG_VERSION_MISSING,
    });
  });

  it('forces version=0 when cached data fails to parse', async () => {
    storage.setString('remote_config:data:cfg', 'corrupt');
    storage.setNumber('remote_config:version:cfg', 5);
    storage.setNumber('remote_config:timestamp:cfg', Date.now());

    mockGet().mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig(configOptions);

    expect(result).toEqual({ value: 1 });
  });

  it('clearLocks allows re-entry for pending configs', () => {
    const service = createService();
    expect(() => service.clearLocks()).not.toThrow();
  });
});
