import { describe, it, expect, vi } from 'vitest';

import { getWalletHistory, getWalletTransfers, getTransferById } from './wallet-history';

function createMockDeps() {
  return {
    walletsDataSource: {
      listWallets: vi.fn(),
      getWalletAssets: vi.fn(),
      getWalletNfts: vi.fn(),
      probeRestrictedRegion: vi.fn(),
      getWalletHistory: vi.fn(),
      getWalletTransfers: vi.fn(),
      getTransferById: vi.fn(),
      callFunction: vi.fn(),
    },
  };
}

describe('getWalletHistory', () => {
  it('delegates to data source with correct arguments', async () => {
    const deps = createMockDeps();
    const expected = { items: [], nextPageToken: null };
    deps.walletsDataSource.getWalletHistory.mockResolvedValue(expected);
    const params = { limit: 10, paginationToken: 'abc' };

    const result = await getWalletHistory('user1', 'w1', params, deps);

    expect(result).toEqual(expected);
    expect(deps.walletsDataSource.getWalletHistory).toHaveBeenCalledWith('w1', 'user1', params);
  });

  it('passes undefined params through', async () => {
    const deps = createMockDeps();
    deps.walletsDataSource.getWalletHistory.mockResolvedValue({ items: [], nextPageToken: null });

    await getWalletHistory('user1', 'w1', undefined, deps);

    expect(deps.walletsDataSource.getWalletHistory).toHaveBeenCalledWith('w1', 'user1', undefined);
  });
});

describe('getWalletTransfers', () => {
  it('delegates to data source with correct arguments', async () => {
    const deps = createMockDeps();
    const expected = { walletId: 'w1', items: [], nextPageToken: null };
    deps.walletsDataSource.getWalletTransfers.mockResolvedValue(expected);

    const result = await getWalletTransfers('user1', 'w1', { limit: 5 }, deps);

    expect(result).toEqual(expected);
    expect(deps.walletsDataSource.getWalletTransfers).toHaveBeenCalledWith('w1', 'user1', { limit: 5 });
  });
});

describe('getTransferById', () => {
  it('delegates to data source with correct arguments', async () => {
    const deps = createMockDeps();
    const transfer = { id: 't1', walletId: 'w1', network: 'ethereum' };
    deps.walletsDataSource.getTransferById.mockResolvedValue(transfer);

    const result = await getTransferById('user1', 'w1', 't1', deps);

    expect(result).toEqual(transfer);
    expect(deps.walletsDataSource.getTransferById).toHaveBeenCalledWith('w1', 't1', 'user1');
  });
});
