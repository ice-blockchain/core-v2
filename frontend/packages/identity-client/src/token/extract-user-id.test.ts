import { describe, it, expect, vi } from 'vitest';
import { extractUserId } from './extract-user-id';
import { IdentityErrorCode } from '../errors';

vi.mock('./parse-user-id-from-token', () => ({
  parseUserIdFromToken: vi.fn((token: string) => (token === 'valid-jwt' ? 'user-123' : null)),
}));

function createMockTokenManager() {
  return {
    getTokens: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  };
}

describe('extractUserId', () => {
  it('returns userId parsed from stored JWT', async () => {
    const tm = createMockTokenManager();
    tm.getTokens.mockResolvedValueOnce({ token: 'valid-jwt', refreshToken: 'rt' });

    const result = await extractUserId('alice', tm);

    expect(result).toBe('user-123');
    expect(tm.getTokens).toHaveBeenCalledWith('alice');
  });

  it('throws UNAUTHENTICATED when no tokens exist', async () => {
    const tm = createMockTokenManager();
    tm.getTokens.mockResolvedValueOnce(null);

    await expect(extractUserId('alice', tm)).rejects.toMatchObject({
      code: IdentityErrorCode.UNAUTHENTICATED,
    });
  });

  it('throws UNKNOWN when userId is missing from JWT', async () => {
    const tm = createMockTokenManager();
    tm.getTokens.mockResolvedValueOnce({ token: 'bad-jwt', refreshToken: 'rt' });

    await expect(extractUserId('alice', tm)).rejects.toMatchObject({
      code: IdentityErrorCode.UNKNOWN,
    });
  });
});
