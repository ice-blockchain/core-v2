import { describe, it, expect, vi } from 'vitest';
import type { CredentialsDataSource } from '../data-sources/credentials-data-source';
import { listCredentials } from './list-credentials';

function createMockDeps() {
  return {
    credentialsDataSource: {
      listCredentials: vi.fn(() => Promise.resolve({
        items: [{ uuid: 'u1', kind: 'Fido2', name: 'key-1' }],
      })),
      initCreateCredential: vi.fn(),
      createCredential: vi.fn(),
    } as unknown as CredentialsDataSource,
  };
}

describe('listCredentials', () => {
  it('returns credential items on success', async () => {
    const deps = createMockDeps();
    const result = await listCredentials('alice', deps);

    expect(result).toEqual([{ uuid: 'u1', kind: 'Fido2', name: 'key-1' }]);
    expect(deps.credentialsDataSource.listCredentials).toHaveBeenCalledWith('alice');
  });

  it('propagates errors from data source', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.credentialsDataSource.listCredentials).mockRejectedValue(new Error('network failure'));
    await expect(listCredentials('alice', deps)).rejects.toThrow('network failure');
  });

  it('returns empty array when no credentials exist', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.credentialsDataSource.listCredentials).mockResolvedValue({ items: [] });
    const result = await listCredentials('alice', deps);
    expect(result).toEqual([]);
  });
});
