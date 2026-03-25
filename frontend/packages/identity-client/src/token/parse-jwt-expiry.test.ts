import { describe, it, expect } from 'vitest';
import { parseJwtExpiry } from './parse-jwt-expiry';

function createJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('parseJwtExpiry', () => {
  it('extracts exp from a valid JWT', () => {
    const token = createJwt({ exp: 1700000000, sub: 'user-1' });
    expect(parseJwtExpiry(token)).toBe(1700000000);
  });

  it('returns null when exp is missing', () => {
    const token = createJwt({ sub: 'user-1' });
    expect(parseJwtExpiry(token)).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(parseJwtExpiry('not-a-jwt')).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    expect(parseJwtExpiry('header.!!!invalid!!!.sig')).toBeNull();
  });
});
