import { describe, it, expect, vi, beforeEach } from 'vitest';

import { signAndBroadcastEvm } from './sign-and-broadcast-evm';
import type { EvmBroadcastRequest, WalletTransferRequest } from './types';

vi.mock('../auth/execute-signed-request', () => ({
  executeSignedRequest: vi.fn(),
}));

import { executeSignedRequest } from '../auth/execute-signed-request';

const mockExecuteSignedRequest = vi.mocked(executeSignedRequest);

function createMockDeps() {
  return {
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    httpClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn(), head: vi.fn() },
    origin: 'https://api.example.com',
  };
}

const transferResponse: WalletTransferRequest = {
  id: 't1', walletId: 'w1', network: 'ethereum',
  requester: { userId: 'u1', tokenId: null, appId: null },
  requestBody: {}, status: 'Pending', dateRequested: '2026-01-01',
  txHash: null, fee: null, dateBroadcasted: null,
  dateConfirmed: null, reason: null, metadata: null,
};

describe('signAndBroadcastEvm', () => {
  beforeEach(() => {
    mockExecuteSignedRequest.mockReset();
  });

  it('calls executeSignedRequest with transaction body', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const request: EvmBroadcastRequest = { kind: 'Transaction', transaction: '0xraw' };
    mockExecuteSignedRequest.mockResolvedValue(transferResponse);

    const result = await signAndBroadcastEvm({ username: 'user1', walletId: 'w1', request, signingContext }, deps);

    expect(result).toEqual(transferResponse);
    expect(mockExecuteSignedRequest).toHaveBeenCalledWith(
      {
        username: 'user1',
        httpMethod: 'POST',
        httpPath: '/wallets/w1/transactions',
        body: request,
        signingContext,
      },
      deps,
    );
  });

  it('encodes walletId in the path', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const request: EvmBroadcastRequest = { kind: 'Transaction', transaction: '0x' };
    mockExecuteSignedRequest.mockResolvedValue(transferResponse);

    await signAndBroadcastEvm({ username: 'user1', walletId: 'a/b', request, signingContext }, deps);

    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    expect(input.httpPath).toBe('/wallets/a%2Fb/transactions');
  });
});
