import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import { translate } from '@ion/localization';
import type { RegisterResult } from '@ion/auth-ui';
import { isValidIdentityKeyName } from '@ion/auth-ui';
import { mapIdentityError } from './error-messages';

export async function registerAccount(
  identityClient: IdentityClient,
  data: { identityKeyName: string; password?: string },
): Promise<RegisterResult> {
  if (!isValidIdentityKeyName(data.identityKeyName)) {
    return { outcome: 'error', error: { code: 'UNKNOWN', numericCode: '600', userMessage: translate('auth:errorInvalidIdentityKeyName') } };
  }
  try {
    return await executeRegistration(identityClient, data);
  } catch (error) {
    Logger.error('Registration failed', { tag: 'auth', error: toError(error), data: { identityKeyName: data.identityKeyName } });
    if (data.password == null && isPasskeyCancelledError(error)) {
      return { outcome: 'cancelled' };
    }
    return { outcome: 'error', error: mapIdentityError(error) };
  }
}

async function executeRegistration(
  identityClient: IdentityClient,
  data: { identityKeyName: string; password?: string },
): Promise<RegisterResult> {
  if (data.password == null) {
    await identityClient.registerWithPasskey(data.identityKeyName);
  } else {
    await identityClient.registerWithPassword({ username: data.identityKeyName, password: data.password });
  }
  const method = data.password == null ? 'passkey' : 'password';
  Logger.info('Registration succeeded', { tag: 'auth', data: { method } });
  return { outcome: 'authenticated' };
}

function isPasskeyCancelledError(error: unknown): boolean {
  return (
    error instanceof IdentityError &&
    (error.code === IdentityErrorCode.PASSKEY_CANCELLED ||
      error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE)
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
