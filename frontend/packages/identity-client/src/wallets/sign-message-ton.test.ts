import { describe, it, expect, vi, beforeEach } from 'vitest';

import { signMessageTon } from './sign-message-ton';
import type { GenerateSignatureResponse } from './types';

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

describe('signMessageTon', () => {
  beforeEach(() => {
    mockExecuteSignedRequest.mockReset();
  });

  it('calls executeSignedRequest with TON signing body', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    mockExecuteSignedRequest.mockResolvedValue(signatureResponse);

    const result = await signMessageTon({ username: 'user1', signingKeyId: 'key1', message: 'hello-ton', signingContext }, deps);

    expect(result).toEqual(signatureResponse);
    expect(mockExecuteSignedRequest).toHaveBeenCalledWith(
      {
        username: 'user1',
        httpMethod: 'POST',
        httpPath: '/keys/key1/signatures',
        body: { blockchainKind: 'Ton', kind: 'Message', message: 'hello-ton' },
        signingContext,
      },
      deps,
    );
  });

  it('encodes signingKeyId in the path', async () => {
    const deps = createMockDeps();
    const signingContext = { kind: 'password' as const, password: 'pass' };
    mockExecuteSignedRequest.mockResolvedValue(signatureResponse);

    await signMessageTon({ username: 'user1', signingKeyId: 'key/special', message: 'msg', signingContext }, deps);

    const [input] = mockExecuteSignedRequest.mock.calls[0]!;
    expect(input.httpPath).toBe('/keys/key%2Fspecial/signatures');
  });
});
