import { describe, it, expect, vi } from 'vitest';

import { callFunction } from './call-function';
import type { CallFunctionRequest } from './types';

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

describe('callFunction', () => {
  it('delegates to data source with correct arguments', async () => {
    const deps = createMockDeps();
    const request: CallFunctionRequest = {
      contract: '0xabc',
      abi: {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
      calldata: { owner: '0x123' },
    };
    const expected = { result: '1000' };
    deps.walletsDataSource.callFunction.mockResolvedValue(expected);

    const result = await callFunction('user1', 'ethereum', request, deps);

    expect(result).toEqual(expected);
    expect(deps.walletsDataSource.callFunction).toHaveBeenCalledWith('ethereum', request, 'user1');
  });
});
