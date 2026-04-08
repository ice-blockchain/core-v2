const INLINE_ERROR_CODES = new Set([
  'USER_NOT_FOUND',
  'USER_ALREADY_EXISTS',
  'INVALID_CREDENTIALS',
  'USER_DEACTIVATED',
  'RESTRICTED_REGION',
]);

export function isInlineAuthError(code: string): boolean {
  return INLINE_ERROR_CODES.has(code);
}
