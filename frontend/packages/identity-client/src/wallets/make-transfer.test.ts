import { describe, it, expect, vi, beforeEach } from 'vitest';

import { makeTransfer } from './make-transfer';
import type { TransferRequest, WalletTransferRequest } from './types';

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

describe('makeTransfer', () => {
  beforeEach(() => {
    mockExecuteSignedRequest.mockReset();
  });

  it('calls executeSignedRequest with stripped undefined fields', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const transfer: TransferRequest = {
      kind: 'Native', to: '0xabc', amount: '100',
    };
    mockExecuteSignedRequest.mockResolvedValue(transferResponse);

    const result = await makeTransfer({ username: 'user1', walletId: 'w1', transfer, signingContext }, deps);

    expect(result).toEqual(transferResponse);
    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    expect(input.body).toEqual({ kind: 'Native', to: '0xabc', amount: '100' });
    expect(input.httpPath).toBe('/wallets/w1/transfers');
    expect(input.httpMethod).toBe('POST');
  });

  it('encodes walletId in the path', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const transfer: TransferRequest = { kind: 'Native', to: '0xabc', amount: '50' };
    mockExecuteSignedRequest.mockResolvedValue(transferResponse);

    await makeTransfer({ username: 'user1', walletId: 'wallet/special', transfer, signingContext }, deps);

    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    expect(input.httpPath).toBe('/wallets/wallet%2Fspecial/transfers');
  });
});
