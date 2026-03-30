const IDENTITY_KEY_PATTERN = /^[a-z0-9._-]+$/;

export function isValidIdentityKeyName(value: string): boolean {
  return value.length > 0 && IDENTITY_KEY_PATTERN.test(value);
}
