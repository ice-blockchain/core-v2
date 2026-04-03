import { describe, it, expect, vi } from 'vitest';
import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import { verifyTwoFACode } from './verify-two-fa-code';

vi.mock('./sign-user-action', () => ({
  signUserAction: vi.fn(() => Promise.resolve('signed-action-token')),
}));

function createMockDeps() {
  return {
    twoFADataSource: {
      requestCode: vi.fn(),
      verifyCode: vi.fn(() => Promise.resolve()),
      deleteMethod: vi.fn(),
    } as unknown as TwoFADataSource,
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    origin: 'https://example.com',
  };
}

describe('verifyTwoFACode', () => {
  it('signs request and passes userAction to data source', async () => {
    const deps = createMockDeps();
    await verifyTwoFACode(
      { username: 'alice', userId: 'u1', twoFAOption: 'totp', code: '123456', signingContext: { kind: 'passkey' } },
      deps,
    );
    expect(deps.twoFADataSource.verifyCode).toHaveBeenCalledWith(
      { userId: 'u1', twoFAOption: 'totp', username: 'alice', userAction: 'signed-action-token' },
      '123456',
    );
  });
});
