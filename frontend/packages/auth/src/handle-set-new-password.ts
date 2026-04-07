import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';

type RecoveryData = { identityKeyName: string; recoveryKeyId: string; recoveryCode: string };

export interface SetNewPasswordInput {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  recoveryData: RecoveryData;
}

export async function handleSetNewPassword(input: SetNewPasswordInput, newPassword: string): Promise<void> {
  const { identityClient, dispatch, recoveryData } = input;
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    await callRecoverAccount(identityClient, recoveryData, newPassword);
    Logger.info('Password recovery succeeded', { tag: 'auth' });
    dispatch({ type: 'SHOW_RESTORE_SUCCESS' });
  } catch (error) {
    handleRecoveryError(dispatch, error);
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}

function callRecoverAccount(client: IdentityClient, data: RecoveryData, newPassword: string): Promise<void> {
  return client.recoverAccount({
    username: data.identityKeyName,
    recoveryCode: data.recoveryCode,
    credentialId: data.recoveryKeyId,
    newCredentialKind: 'PasswordProtectedKey',
    newPassword,
  });
}

function handleRecoveryError(dispatch: (action: AuthFlowAction) => void, error: unknown): void {
  logRecoveryError(error);
  if (isInvalidRecoveryCredentials(error)) {
    dispatch({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
  } else {
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  }
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
