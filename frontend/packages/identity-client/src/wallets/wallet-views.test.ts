import { describe, it, expect, vi } from 'vitest';
import type { TokenManager } from '../token/token-manager';
import type { WalletViewsDataSource } from '../data-sources/wallet-views-data-source';
import {
  listWalletViews,
  createWalletView,
  getWalletView,
  updateWalletView,
  deleteWalletView,
} from './wallet-views';

vi.mock('../token/extract-user-id', () => ({
  extractUserId: vi.fn().mockResolvedValue('user-123'),
}));

function createMockDeps() {
  const walletViewsDataSource: WalletViewsDataSource = {
    listWalletViews: vi.fn(),
    createWalletView: vi.fn(),
    getWalletView: vi.fn(),
    updateWalletView: vi.fn(),
    deleteWalletView: vi.fn(),
  };
  const tokenManager = {} as TokenManager;
  return { walletViewsDataSource, tokenManager };
}

const mockDetail = {
  id: 'v1',
  name: 'View',
  coins: [],
  aggregation: {},
  symbolGroups: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  userId: 'user-123',
  nfts: null,
};

describe('listWalletViews', () => {
  it('applies defaults when coins and symbolGroups are null', async () => {
    const deps = createMockDeps();
    const raw = { id: 'v1', name: 'View', coins: null, symbolGroups: null, createdAt: '', updatedAt: '', userId: '' };
    vi.mocked(deps.walletViewsDataSource.listWalletViews).mockResolvedValueOnce([raw as never]);

    const result = await listWalletViews('alice', deps);

    expect(result[0]!.coins).toEqual([]);
    expect(result[0]!.symbolGroups).toEqual([]);
    expect(deps.walletViewsDataSource.listWalletViews).toHaveBeenCalledWith('user-123', 'alice');
  });
});

describe('createWalletView', () => {
  it('forwards correct arguments to data source', async () => {
    const deps = createMockDeps();
    const input = { name: 'New View', items: [], symbolGroups: ['BTC'] };
    vi.mocked(deps.walletViewsDataSource.createWalletView).mockResolvedValueOnce(mockDetail);

    const result = await createWalletView('alice', input, deps);

    expect(deps.walletViewsDataSource.createWalletView).toHaveBeenCalledWith('user-123', input, 'alice');
    expect(result).toEqual(mockDetail);
  });
});

describe('getWalletView', () => {
  it('normalizes totalBalance from number to string and extracts nextPageToken', async () => {
    const deps = createMockDeps();
    const detail = {
      ...mockDetail,
      aggregation: {
        BTC: { wallets: [], totalBalance: 42 as unknown as string },
        ETH: { wallets: [], totalBalance: null as unknown as string },
      },
    };
    vi.mocked(deps.walletViewsDataSource.getWalletView).mockResolvedValueOnce({
      body: detail,
      headers: { 'x-next-page': 'page-2' },
    });

    const result = await getWalletView('alice', { walletViewId: 'v1', params: { limit: 10 } }, deps);

    expect(result.aggregation['BTC']?.totalBalance).toBe('42');
    expect(result.aggregation['ETH']?.totalBalance).toBe('0');
    expect(result.nextPageToken).toBe('page-2');
  });

  it('returns null nextPageToken when header is absent', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.walletViewsDataSource.getWalletView).mockResolvedValueOnce({
      body: mockDetail,
      headers: {},
    });

    const result = await getWalletView('alice', { walletViewId: 'v1' }, deps);

    expect(result.nextPageToken).toBeNull();
  });
});

describe('updateWalletView', () => {
  it('forwards correct arguments to data source', async () => {
    const deps = createMockDeps();
    const input = { name: 'Updated', items: [], symbolGroups: [] };
    vi.mocked(deps.walletViewsDataSource.updateWalletView).mockResolvedValueOnce(mockDetail);

    const result = await updateWalletView('alice', { walletViewId: 'v1', input }, deps);

    expect(deps.walletViewsDataSource.updateWalletView).toHaveBeenCalledWith('user-123', 'v1', input, 'alice');
    expect(result).toEqual(mockDetail);
  });
});

describe('deleteWalletView', () => {
  it('calls delete on data source with correct arguments', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.walletViewsDataSource.deleteWalletView).mockResolvedValueOnce(undefined);

    await deleteWalletView('alice', 'v1', deps);

    expect(deps.walletViewsDataSource.deleteWalletView).toHaveBeenCalledWith('user-123', 'v1', 'alice');
  });
});
