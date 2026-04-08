import { describe, it, expect, vi } from 'vitest';
import type { KeysDataSource } from '../data-sources/keys-data-source';
import type { KeyResponse, ListKeysResponse } from './types';
import type { SigningContext } from '../types';
import { listKeys, createKey, deriveKey, updateKey } from './keys';

vi.mock('../auth/execute-signed-request', () => ({
  executeSignedRequest: vi.fn(),
}));

import { executeSignedRequest } from '../auth/execute-signed-request';

const mockKeyResponse: KeyResponse = {
  id: 'key-1',
  scheme: 'ECDSA',
  curve: 'secp256k1',
  publicKey: '0xabc',
  name: 'My Key',
  status: 'Active',
  custodial: false,
  dateCreated: '2026-01-01T00:00:00Z',
};

const signingContext: SigningContext = { kind: 'password', password: 'test-pass' };

function createMockReadDeps() {
  const keysDataSource: KeysDataSource = {
    listKeys: vi.fn(),
  };
  return { keysDataSource };
}

function createMockWriteDeps() {
  return {
    userActionDataSource: { createUserAction: vi.fn() },
    httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    origin: 'https://api.example.com',
  };
}

describe('listKeys', () => {
  it('forwards arguments to keysDataSource', async () => {
    const deps = createMockReadDeps();
    const mockResponse: ListKeysResponse = { items: [mockKeyResponse], nextPageToken: null };
    vi.mocked(deps.keysDataSource.listKeys).mockResolvedValue(mockResponse);

    const result = await listKeys('alice', { limit: 10 }, deps);

    expect(result).toEqual(mockResponse);
    expect(deps.keysDataSource.listKeys).toHaveBeenCalledWith('alice', { limit: 10 });
  });
});

describe('createKey', () => {
  it('includes name in body when provided', async () => {
    const deps = createMockWriteDeps();
    vi.mocked(executeSignedRequest).mockResolvedValue(mockKeyResponse);

    await createKey({ username: 'alice', input: { scheme: 'ECDSA', curve: 'secp256k1', name: 'My Key' }, signingContext }, deps);

    expect(executeSignedRequest).toHaveBeenCalledWith(
      { username: 'alice', httpMethod: 'POST', httpPath: '/keys', body: { scheme: 'ECDSA', curve: 'secp256k1', name: 'My Key' }, signingContext },
      deps,
    );
  });

  it('omits name from body when undefined', async () => {
    const deps = createMockWriteDeps();
    vi.mocked(executeSignedRequest).mockResolvedValue(mockKeyResponse);

    await createKey({ username: 'alice', input: { scheme: 'ECDSA', curve: 'secp256k1' }, signingContext }, deps);

    expect(executeSignedRequest).toHaveBeenCalledWith(
      { username: 'alice', httpMethod: 'POST', httpPath: '/keys', body: { scheme: 'ECDSA', curve: 'secp256k1' }, signingContext },
      deps,
    );
  });
});

describe('deriveKey', () => {
  it('uses correct path with encoded keyId', async () => {
    const deps = createMockWriteDeps();
    vi.mocked(executeSignedRequest).mockResolvedValue({ output: 'derived-value' });

    const result = await deriveKey(
      { username: 'alice', keyId: 'key-1', input: { domain: 'ice.io', seed: 'abc' }, signingContext }, deps,
    );

    expect(result).toEqual({ output: 'derived-value' });
    expect(executeSignedRequest).toHaveBeenCalledWith(
      { username: 'alice', httpMethod: 'POST', httpPath: '/keys/key-1/derive', body: { domain: 'ice.io', seed: 'abc' }, signingContext },
      deps,
    );
  });
});

describe('updateKey', () => {
  it('sends PUT with name in body', async () => {
    const deps = createMockWriteDeps();
    vi.mocked(executeSignedRequest).mockResolvedValue(mockKeyResponse);

    const result = await updateKey({ username: 'alice', keyId: 'key-1', name: 'Renamed Key', signingContext }, deps);

    expect(result).toEqual(mockKeyResponse);
    expect(executeSignedRequest).toHaveBeenCalledWith(
      { username: 'alice', httpMethod: 'PUT', httpPath: '/keys/key-1', body: { name: 'Renamed Key' }, signingContext },
      deps,
    );
  });
});
