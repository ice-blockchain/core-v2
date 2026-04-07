import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { LoginAttemptResult } from '@ion/auth-ui';
import { isValidIdentityKeyName } from '@ion/auth-ui';
import { mapIdentityError } from './error-messages';

export async function attemptLogin(
  identityClient: IdentityClient,
  identityKeyName: string,
): Promise<LoginAttemptResult> {
  if (!isValidIdentityKeyName(identityKeyName)) {
    return { outcome: 'error', error: mapIdentityError(buildUserNotFoundError()) };
  }
  try {
    return await resolveLoginRoute(identityClient, identityKeyName);
  } catch (error) {
    Logger.error('Login attempt failed', { tag: 'auth', error: toError(error), data: { identityKeyName } });
    return { outcome: 'error', error: mapIdentityError(error) };
  }
}

async function resolveLoginRoute(
  identityClient: IdentityClient,
  identityKeyName: string,
): Promise<LoginAttemptResult> {
  const capabilities = await identityClient.getLoginCapabilities(identityKeyName);
  if (!capabilities.identityFound) {
    return { outcome: 'error', error: mapIdentityError(buildUserNotFoundError()) };
  }
  if (capabilities.supportsPasskey) {
    return tryPasskeyLogin(identityClient, identityKeyName, capabilities.supportsPassword);
  }
  if (capabilities.supportsPassword) {
    return { outcome: 'needs-password', identityKeyName };
  }
  return { outcome: 'error', error: mapIdentityError(buildUserNotFoundError()) };
}

async function tryPasskeyLogin(
  identityClient: IdentityClient,
  identityKeyName: string,
  supportsPassword: boolean,
): Promise<LoginAttemptResult> {
  try {
    await identityClient.loginWithPasskey(identityKeyName);
    Logger.info('Passkey login succeeded', { tag: 'auth' });
    return { outcome: 'authenticated' };
  } catch (error) {
    if (isPasskeyFallbackError(error) && supportsPassword) {
      Logger.info('Passkey login failed, falling back to password', { tag: 'auth' });
      return { outcome: 'needs-password', identityKeyName };
    }
    return { outcome: 'error', error: mapIdentityError(error) };
  }
}

function buildUserNotFoundError(): IdentityError {
  return new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'User not found');
}

function isPasskeyFallbackError(error: unknown): boolean {
  return (
    error instanceof IdentityError &&
    (error.code === IdentityErrorCode.PASSKEY_CANCELLED ||
      error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE)
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
