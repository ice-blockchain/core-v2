import { describe, it, expect } from 'vitest';
import {
  validateActionChallengeResponse,
  validateRegistrationChallengeResponse,
  validateAuthTokensResponse,
  validateRegistrationResultResponse,
  validateRefreshTokenResponse,
} from './validate-response';

describe('validateActionChallengeResponse', () => {
  const valid = {
    challenge: 'abc123',
    challengeIdentifier: 'ci-1',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: { webauthn: [], passwordProtectedKey: [] },
    supportedCredentialKinds: [],
    attestation: 'direct',
    userVerification: 'preferred',
    externalAuthenticationUrl: '',
  };

  it('accepts a valid response', () => {
    expect(() => validateActionChallengeResponse(valid)).not.toThrow();
  });

  it('rejects null', () => {
    expect(() => validateActionChallengeResponse(null)).toThrow('Invalid login challenge');
  });

  it('rejects missing challenge field', () => {
    expect(() => validateActionChallengeResponse({ ...valid, challenge: '' })).toThrow('missing or empty challenge');
  });

  it('rejects missing rp.id', () => {
    expect(() => validateActionChallengeResponse({ ...valid, rp: { id: '', name: 'X' } })).toThrow('missing or empty id');
  });

  it('rejects missing allowCredentials', () => {
    expect(() => validateActionChallengeResponse({ ...valid, allowCredentials: null })).toThrow('missing allowCredentials');
  });

  it('rejects allowCredentials as array', () => {
    const response = {
      challenge: 'c', challengeIdentifier: 'ci',
      rp: { id: 'r', name: 'n' },
      allowCredentials: [],
    };
    expect(() => validateActionChallengeResponse(response)).toThrow();
  });
});

describe('validateRegistrationChallengeResponse', () => {
  const valid = {
    challenge: 'abc123',
    rp: { id: 'example.com', name: 'Example' },
    user: { id: 'u1', name: 'alice', displayName: 'Alice' },
    temporaryAuthenticationToken: 'tok',
    attestation: 'direct',
    pubKeyCredParams: [],
    excludeCredentials: [],
    authenticatorSelection: null,
    supportedCredentialKinds: null,
    allowedRecoveryCredentials: null,
  };

  it('accepts a valid response', () => {
    expect(() => validateRegistrationChallengeResponse(valid)).not.toThrow();
  });

  it('rejects missing user', () => {
    expect(() => validateRegistrationChallengeResponse({ ...valid, user: null })).toThrow('missing user');
  });
});

describe('validateAuthTokensResponse', () => {
  it('accepts valid tokens', () => {
    expect(() => validateAuthTokensResponse({ token: 't', refreshToken: 'r' })).not.toThrow();
  });

  it('rejects empty token', () => {
    expect(() => validateAuthTokensResponse({ token: '', refreshToken: 'r' })).toThrow('missing or empty token');
  });

  it('rejects null', () => {
    expect(() => validateAuthTokensResponse(null)).toThrow('Invalid auth tokens');
  });
});

describe('validateRegistrationResultResponse', () => {
  it('accepts valid result', () => {
    const valid = { authentication: { token: 't', refreshToken: 'r' }, user: { id: 'u1' } };
    expect(() => validateRegistrationResultResponse(valid)).not.toThrow();
  });

  it('rejects missing authentication', () => {
    expect(() => validateRegistrationResultResponse({ user: { id: 'u1' } })).toThrow('missing authentication');
  });
});

describe('validateRefreshTokenResponse', () => {
  it('accepts valid response', () => {
    expect(() => validateRefreshTokenResponse({ token: 'new-token' })).not.toThrow();
  });

  it('rejects missing token', () => {
    expect(() => validateRefreshTokenResponse({})).toThrow('missing or empty token');
  });
});
