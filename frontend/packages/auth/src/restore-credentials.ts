import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode, isPasskeyAvailable } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { RecoveryData, RestoreResult } from './types';
import { mapIdentityError } from './error-messages';

export async function restoreCredentials(
  identityClient: IdentityClient,
  data: RecoveryData,
): Promise<RestoreResult> {
  try {
    if (!isPasskeyAvailable()) {
      return { outcome: 'needs-password', identityKeyName: data.identityKeyName };
    }
    await callPasskeyRecovery(identityClient, data);
    Logger.info('Passkey recovery succeeded', { tag: 'auth' });
    return { outcome: 'restored' };
  } catch (error) {
    return handleRecoveryError(error);
  }
}

function callPasskeyRecovery(client: IdentityClient, data: RecoveryData): Promise<void> {
  return client.recoverAccount({
    username: data.identityKeyName,
    recoveryCode: data.recoveryCode,
    credentialId: data.recoveryKeyId,
    newCredentialKind: 'Fido2',
  });
}

function handleRecoveryError(error: unknown): RestoreResult {
  if (isPasskeyPlatformError(error)) {
    Logger.info('Passkey cancelled during recovery, falling back to password', { tag: 'auth' });
    return { outcome: 'needs-password', identityKeyName: '' };
  }
  logRecoveryError(error);
  if (isInvalidRecoveryCredentials(error)) {
    return { outcome: 'invalid-credentials' };
  }
  return { outcome: 'error', error: mapIdentityError(error) };
}

function logRecoveryError(error: unknown): void {
  Logger.error('Account recovery failed', {
    tag: 'auth',
    error: error instanceof Error ? error : new Error(String(error)),
  });
}

function isPasskeyPlatformError(error: unknown): boolean {
  if (!(error instanceof IdentityError)) return false;
  return error.code === IdentityErrorCode.PASSKEY_CANCELLED || error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE;
}

function isInvalidRecoveryCredentials(error: unknown): boolean {
  if (!(error instanceof IdentityError)) return false;
  return error.code === IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS || error.code === IdentityErrorCode.USER_NOT_FOUND;
}
