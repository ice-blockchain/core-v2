import { NetworkError } from '@ion/network';
import { IdentityError, IdentityErrorCode } from './errors';

const SERVER_CODES = new Set(['SERVER_ERROR']);
const CONNECTIVITY_CODES = new Set(['NETWORK_OFFLINE', 'NETWORK_TIMEOUT', 'REQUEST_ABORTED']);

export function mapNetworkError(error: unknown): IdentityError {
  if (error instanceof IdentityError) return error;
  if (error instanceof NetworkError) {
    if (SERVER_CODES.has(error.code)) {
      return new IdentityError(IdentityErrorCode.SERVER_ERROR, error.message, error);
    }
    if (CONNECTIVITY_CODES.has(error.code)) {
      return new IdentityError(IdentityErrorCode.NETWORK_ERROR, error.message, error);
    }
  }
  return new IdentityError(IdentityErrorCode.UNKNOWN, messageFromUnknown(error), error);
}

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
