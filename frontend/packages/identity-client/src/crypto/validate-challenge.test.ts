import { describe, it, expect } from 'vitest';
import { validateChallengeFormat } from './validate-challenge';
import { IdentityErrorCode } from '../errors';

describe('validateChallengeFormat', () => {
  it('accepts a valid base64url challenge', () => {
    expect(() => validateChallengeFormat('Y2hhbGxlbmdlLXN0cmluZw')).not.toThrow();
  });

  it('accepts a 16-character minimum challenge', () => {
    expect(() => validateChallengeFormat('abcdefghijklmnop')).not.toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => validateChallengeFormat('')).toThrow(
      expect.objectContaining({ code: IdentityErrorCode.UNKNOWN }),
    );
  });

  it('rejects a challenge shorter than 16 characters', () => {
    expect(() => validateChallengeFormat('short')).toThrow(
      expect.objectContaining({ code: IdentityErrorCode.UNKNOWN }),
    );
  });

  it('rejects a challenge with invalid characters', () => {
    expect(() => validateChallengeFormat('invalid challenge!@#$%^&*()')).toThrow(
      expect.objectContaining({ code: IdentityErrorCode.UNKNOWN }),
    );
  });
});
