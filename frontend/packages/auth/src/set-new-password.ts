import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { RecoveryData, SetNewPasswordResult } from './types';
import { mapIdentityError } from './error-messages';

export async function setNewPassword(
  identityClient: IdentityClient,
  recoveryData: RecoveryData,
  newPassword: string,
): Promise<SetNewPasswordResult> {
  try {
    await callRecoverAccount(identityClient, recoveryData, newPassword);
    Logger.info('Password recovery succeeded', { tag: 'auth' });
    return { outcome: 'restored' };
  } catch (error) {
    return handleRecoveryError(error);
  }
}

function callRecoverAccount(
  client: IdentityClient,
  data: RecoveryData,
  newPassword: string,
): Promise<void> {
  return client.recoverAccount({
    username: data.identityKeyName,
    recoveryCode: data.recoveryCode,
    credentialId: data.recoveryKeyId,
    newCredentialKind: 'PasswordProtectedKey',
    newPassword,
  });
}

function handleRecoveryError(error: unknown): SetNewPasswordResult {
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

function isInvalidRecoveryCredentials(error: unknown): boolean {
  if (!(error instanceof IdentityError)) return false;
  return error.code === IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS || error.code === IdentityErrorCode.USER_NOT_FOUND;
}
