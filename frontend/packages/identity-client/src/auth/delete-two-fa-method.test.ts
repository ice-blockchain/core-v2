import { describe, it, expect, vi } from 'vitest';

import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';

import { deleteTwoFAMethod } from './delete-two-fa-method';

vi.mock('./sign-user-action', () => ({
  signUserAction: vi.fn(() => Promise.resolve('ua-token')),
}));

function createMockDeps() {
  return {
    twoFADataSource: {
      requestCode: vi.fn(),
      verifyCode: vi.fn(),
      deleteMethod: vi.fn(() => Promise.resolve()),
    } as unknown as TwoFADataSource,
    userActionDataSource: {
      initAction: vi.fn(),
      completeAction: vi.fn(),
    } as unknown as UserActionDataSource,
    origin: 'https://example.com',
  };
}

function defaultParams() {
  return {
    username: 'alice',
    userId: 'u1',
    twoFAOption: 'totp',
    twoFAValue: 'val1',
    verificationParams: [
      { twoFAOptionVerificationValue: 'email', twoFAOptionVerificationCode: '111' },
    ],
    signingContext: { kind: 'password' as const, password: 'pass' },
  };
}

describe('deleteTwoFAMethod', () => {
  it('signs the request and calls deleteMethod on data source', async () => {
    const deps = createMockDeps();
    await deleteTwoFAMethod(defaultParams(), deps);
    expect(deps.twoFADataSource.deleteMethod).toHaveBeenCalledWith({
      userId: 'u1',
      twoFAOption: 'totp',
      twoFAValue: 'val1',
      verificationParams: [
        { twoFAOptionVerificationValue: 'email', twoFAOptionVerificationCode: '111' },
      ],
      username: 'alice',
      userAction: 'ua-token',
    });
  });
});
