import { describe, it, expect } from 'vitest';
import { isValidIdentityKeyName } from './validate-identity-key-name';

describe('isValidIdentityKeyName', () => {
  it('accepts valid lowercase alphanumeric names', () => {
    expect(isValidIdentityKeyName('alice')).toBe(true);
    expect(isValidIdentityKeyName('bob123')).toBe(true);
  });

  it('accepts names with dots, hyphens, and underscores', () => {
    expect(isValidIdentityKeyName('alice.bob')).toBe(true);
    expect(isValidIdentityKeyName('alice-bob')).toBe(true);
    expect(isValidIdentityKeyName('alice_bob')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidIdentityKeyName('')).toBe(false);
  });

  it('rejects uppercase characters', () => {
    expect(isValidIdentityKeyName('Alice')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidIdentityKeyName('alice bob')).toBe(false);
  });

  it('rejects special characters', () => {
    expect(isValidIdentityKeyName('alice@bob')).toBe(false);
    expect(isValidIdentityKeyName("'; DROP TABLE users;--")).toBe(false);
  });

  it('rejects unicode characters', () => {
    expect(isValidIdentityKeyName('\u0430lice')).toBe(false);
  });
});
