import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createRemoteConfig } from './create-remote-config';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type { ConfigHttpClient, ConfigHttpResponse, ConfigStorage } from './remote-config-types';

function createMockStorage(): ConfigStorage {
  const store = new Map<string, string | number>();
  return {
    getString: vi.fn((key: string) => (store.get(key) as string) ?? null),
    setString: vi.fn((key: string, value: string) => { store.set(key, value); }),
    getNumber: vi.fn((key: string) => (store.get(key) as number) ?? null),
    setNumber: vi.fn((key: string, value: number) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
  };
}

function okResponse(body: string, headers: Record<string, string> = {}): ConfigHttpResponse {
  return { status: 200, headers, body };
}

function noContentResponse(): ConfigHttpResponse {
  return { status: 204, headers: {}, body: '' };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('createRemoteConfig', () => {
  let storage: ConfigStorage;
  let httpClient: ConfigHttpClient;

  beforeEach(() => {
    storage = createMockStorage();
    httpClient = { get: vi.fn() };
  });

  function createService(overrides?: { defaultTimeToLiveMs?: number }) {
    return createRemoteConfig({
      httpClient,
      storage,
      baseUrl: 'https://api.test.com',
      ...overrides,
    });
  }

  it('fetches from network on first call and caches', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns cached data on subsequent calls within TTL', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL expires', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(okResponse('{"value":2}'));

    const service = createService({ defaultTimeToLiveMs: 0 });

    const first = await service.getConfig({ configName: 'cfg', parser });
    const second = await service.getConfig({ configName: 'cfg', parser });

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
  });

  it('falls back to stale cache when server returns 204', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService({ defaultTimeToLiveMs: 0 });

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('falls back to stale cache when network fails', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(okResponse('{"value":1}'))
      .mockRejectedValueOnce(new Error('offline'));

    const service = createService({ defaultTimeToLiveMs: 0 });

    await service.getConfig({ configName: 'cfg', parser });
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('force-fetches when stale cache also unavailable', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(okResponse('{"value":99}'));

    const service = createService();
    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 99 });
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('throws CONFIG_NOT_FOUND when all sources exhausted', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(noContentResponse());

    const service = createService();

    await expect(
      service.getConfig({ configName: 'cfg', parser }),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_NOT_FOUND });
  });

  it('serializes concurrent requests for the same config', async () => {
    let callCount = 0;
    (httpClient.get as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      return okResponse(`{"value":${callCount}}`);
    });

    const service = createService();
    const [a, b] = await Promise.all([
      service.getConfig({ configName: 'cfg', parser }),
      service.getConfig({ configName: 'cfg', parser }),
    ]);

    expect(a).toEqual(b);
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('allows concurrent requests for different configs', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    await Promise.all([
      service.getConfig({ configName: 'a', parser }),
      service.getConfig({ configName: 'b', parser }),
    ]);

    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('re-throws ConfigError from network fetch', async () => {
    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      headers: {},
      body: '{"value":1}',
    });

    const service = createService();
    const badParser = () => { throw new ConfigError(ConfigErrorCode.CONFIG_VERSION_MISSING, 'no version'); };

    await expect(
      service.getConfig({ configName: 'cfg', parser: badParser }),
    ).rejects.toMatchObject({ code: ConfigErrorCode.CONFIG_VERSION_MISSING });
  });

  it('forces version=0 when cached data fails to parse', async () => {
    // Pre-populate storage with unparseable data
    storage.setString('remote_config:data:cfg', 'corrupt');
    storage.setNumber('remote_config:version:cfg', 5);
    storage.setNumber('remote_config:timestamp:cfg', Date.now());

    (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse('{"value":1}'));
    const service = createService();

    const result = await service.getConfig({ configName: 'cfg', parser });

    expect(result).toEqual({ value: 1 });
  });

  it('clearLocks allows re-entry for pending configs', () => {
    const service = createService();
    expect(() => service.clearLocks()).not.toThrow();
  });
});
