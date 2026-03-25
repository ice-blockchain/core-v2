import { describe, it, expect } from 'vitest';
import { IdentityError, IdentityErrorCode } from './errors';

describe('IdentityError', () => {
  it('stores code and message', () => {
    const error = new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'User does not exist');
    expect(error.code).toBe(IdentityErrorCode.USER_NOT_FOUND);
    expect(error.message).toBe('User does not exist');
    expect(error.name).toBe('IdentityError');
  });

  it('stores optional cause', () => {
    const cause = new Error('original');
    const error = new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'Network failed', cause);
    expect(error.cause).toBe(cause);
  });

  it('extends Error', () => {
    const error = new IdentityError(IdentityErrorCode.UNKNOWN, 'test');
    expect(error).toBeInstanceOf(Error);
  });
});
