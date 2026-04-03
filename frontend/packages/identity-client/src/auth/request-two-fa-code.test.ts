import { describe, it, expect, vi } from 'vitest';
import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import { requestTwoFACode } from './request-two-fa-code';

vi.mock('./sign-user-action', () => ({
  signUserAction: vi.fn(() => Promise.resolve('signed-action-token')),
}));

function createMockDeps() {
  return {
    twoFADataSource: {
      requestCode: vi.fn(() => Promise.resolve({ TOTPAuthenticatorURL: 'otpauth://...' })),
      verifyCode: vi.fn(),
      deleteMethod: vi.fn(),
    } as unknown as TwoFADataSource,
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    origin: 'https://example.com',
  };
}

describe('requestTwoFACode', () => {
  it('signs request and passes userAction to data source', async () => {
    const deps = createMockDeps();
    const result = await requestTwoFACode(
      { username: 'alice', userId: 'u1', twoFAOption: 'email', input: { email: 'a@b.com' }, signingContext: { kind: 'passkey' } },
      deps,
    );
    expect(result).toEqual({ TOTPAuthenticatorURL: 'otpauth://...' });
    expect(deps.twoFADataSource.requestCode).toHaveBeenCalledWith(
      { userId: 'u1', twoFAOption: 'email', username: 'alice', userAction: 'signed-action-token' },
      { email: 'a@b.com' },
    );
  });
});
