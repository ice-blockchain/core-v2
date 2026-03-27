export enum IdentityErrorCode {
  PASSKEY_NOT_AVAILABLE = 'PASSKEY_NOT_AVAILABLE',
  PASSKEY_CANCELLED = 'PASSKEY_CANCELLED',
  PASSKEY_VALIDATION_FAILED = 'PASSKEY_VALIDATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class IdentityError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
