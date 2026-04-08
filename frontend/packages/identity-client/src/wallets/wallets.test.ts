import { describe, it, expect, vi } from 'vitest';
import { NetworkError } from '@ion/network';

import { IdentityError, IdentityErrorCode } from '../errors';
import {
  listWallets,
  getWalletAssets,
  getWalletNfts,
  createWallet,
  probeRestrictedRegion,
} from './wallets';
import type { Wallet, WalletAsset, WalletNft } from './types';

vi.mock('../auth/execute-signed-request', () => ({
  executeSignedRequest: vi.fn(),
}));

import { executeSignedRequest } from '../auth/execute-signed-request';

const mockExecuteSignedRequest = vi.mocked(executeSignedRequest);

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

function createMockWriteDeps() {
  return {
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    httpClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), head: vi.fn() },
    origin: 'https://api.example.com',
  };
}

const wallet: Wallet = {
  id: 'w1', network: 'ethereum', status: 'Active',
  signingKey: { scheme: 'ECDSA', curve: 'secp256k1', publicKey: '0xabc', id: 'k1' },
  address: '0x123', name: 'My Wallet',
};

describe('listWallets', () => {
  it('returns items from data source response', async () => {
    const deps = createMockDeps();
    deps.walletsDataSource.listWallets.mockResolvedValue({ items: [wallet] });
    const result = await listWallets('user1', deps);
    expect(result).toEqual([wallet]);
    expect(deps.walletsDataSource.listWallets).toHaveBeenCalledWith('user1');
  });
});

describe('getWalletAssets', () => {
  it('normalizes asset balances to strings', async () => {
    const deps = createMockDeps();
    const rawAsset = { kind: 'Native', decimals: 18, balance: 12345 } as unknown as WalletAsset;
    deps.walletsDataSource.getWalletAssets.mockResolvedValue({
      walletId: 'w1', network: 'ethereum', assets: [rawAsset],
    });
    const result = await getWalletAssets('user1', 'w1', deps);
    expect(result.assets[0]!.balance).toBe('12345');
    expect(deps.walletsDataSource.getWalletAssets).toHaveBeenCalledWith('w1', 'user1');
  });
});

describe('getWalletNfts', () => {
  it('returns nfts from data source response', async () => {
    const deps = createMockDeps();
    const nft: WalletNft = {
      kind: 'Erc721', contract: '0xabc', symbol: 'NFT', tokenId: '1',
      tokenUri: 'uri', description: 'desc', name: 'Cool NFT',
      network: 'ethereum', collectionImageUri: 'img', walletId: 'w1',
    };
    deps.walletsDataSource.getWalletNfts.mockResolvedValue({
      walletId: 'w1', network: 'ethereum', nfts: [nft],
    });
    const result = await getWalletNfts('user1', 'w1', deps);
    expect(result).toEqual([nft]);
  });
});

describe('createWallet', () => {
  it('calls executeSignedRequest with correct parameters', async () => {
    const deps = createMockWriteDeps();
    const input = { network: 'ethereum', name: 'New Wallet' };
    const signingContext = { kind: 'password' as const, password: 'pass' };
    mockExecuteSignedRequest.mockResolvedValue(wallet);

    const result = await createWallet({ username: 'user1', input, signingContext }, deps);

    expect(result).toEqual(wallet);
    expect(mockExecuteSignedRequest).toHaveBeenCalledWith(
      { username: 'user1', httpMethod: 'POST', httpPath: '/wallets', body: input, signingContext },
      deps,
    );
  });
});

describe('probeRestrictedRegion', () => {
  it('returns null on success', async () => {
    const deps = createMockDeps();
    deps.walletsDataSource.probeRestrictedRegion.mockResolvedValue({});
    const result = await probeRestrictedRegion('alice', deps);
    expect(result).toBeNull();
  });

  it('throws IdentityError for restricted region', async () => {
    const deps = createMockDeps();
    const networkError = new NetworkError({
      code: 'CLIENT_ERROR',
      message: 'Forbidden',
      status: 403,
      responseBody: { code: 'restricted_region' },
    });
    deps.walletsDataSource.probeRestrictedRegion.mockRejectedValue(networkError);

    await expect(probeRestrictedRegion('alice', deps)).rejects.toThrow(IdentityError);
    await expect(probeRestrictedRegion('alice', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.RESTRICTED_REGION,
    });
  });

  it('returns null for non-restricted-region errors', async () => {
    const deps = createMockDeps();
    const genericError = new Error('Network failure');
    deps.walletsDataSource.probeRestrictedRegion.mockRejectedValue(genericError);
    const result = await probeRestrictedRegion('alice', deps);
    expect(result).toBeNull();
  });
});
