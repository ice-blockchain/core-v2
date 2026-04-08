import { describe, it, expect, vi, beforeEach } from 'vitest';

import { generateSignature } from './generate-signature';
import type { GenerateSignatureRequest, GenerateSignatureResponse } from './types';

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

const signatureResponse: GenerateSignatureResponse = {
  id: 's1', keyId: 'k1',
  requester: { userId: 'u1', tokenId: null, appId: null },
  requestBody: {}, status: 'Signed',
  signature: { r: '0x1', s: '0x2' },
  dateRequested: '2026-01-01', dateSigned: '2026-01-01',
};

describe('generateSignature', () => {
  beforeEach(() => {
    mockExecuteSignedRequest.mockReset();
  });

  it('hex-encodes message for Message variant', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const request: GenerateSignatureRequest = { kind: 'Message', message: 'hello' };
    mockExecuteSignedRequest.mockResolvedValue(signatureResponse);

    await generateSignature({ username: 'user1', walletId: 'w1', request, signingContext }, deps);

    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    const expectedHex = Buffer.from('hello').toString('hex');
    expect((input.body as { message: string }).message).toBe(expectedHex);
    expect((input.body as GenerateSignatureRequest).kind).toBe('Message');
  });

  it('passes Hash variant through without modification', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const request: GenerateSignatureRequest = { kind: 'Hash', hash: '0xdeadbeef' };
    mockExecuteSignedRequest.mockResolvedValue(signatureResponse);

    await generateSignature({ username: 'user1', walletId: 'w1', request, signingContext }, deps);

    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    expect(input.body).toEqual(request);
  });

  it('calls executeSignedRequest with correct path', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    const request: GenerateSignatureRequest = { kind: 'Hash', hash: '0x1' };
    mockExecuteSignedRequest.mockResolvedValue(signatureResponse);

    const result = await generateSignature({ username: 'user1', walletId: 'w1', request, signingContext }, deps);

    expect(result).toEqual(signatureResponse);
    expect(mockExecuteSignedRequest).toHaveBeenCalledWith(
      {
        username: 'user1',
        httpMethod: 'POST',
        httpPath: '/wallets/w1/signatures',
        body: request,
        signingContext,
      },
      deps,
    );
  });
});
