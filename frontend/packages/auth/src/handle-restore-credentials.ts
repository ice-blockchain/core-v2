import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode, isPasskeyAvailable } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';

type RecoveryData = { identityKeyName: string; recoveryKeyId: string; recoveryCode: string };
type Dispatch = (action: AuthFlowAction) => void;

interface RestoreCredentialsInput {
  identityClient: IdentityClient;
  dispatch: Dispatch;
  onRecoveryData: (data: RecoveryData) => void;
}

export async function handleRestoreCredentials(
  input: RestoreCredentialsInput,
  data: RecoveryData,
): Promise<void> {
  const { identityClient, dispatch, onRecoveryData } = input;
  onRecoveryData(data);
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    if (!isPasskeyAvailable()) {
      dispatch({ type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: data.identityKeyName });
      return;
    }
    await callPasskeyRecovery(identityClient, data);
    Logger.info('Passkey recovery succeeded', { tag: 'auth' });
    dispatch({ type: 'SHOW_RESTORE_SUCCESS' });
  } catch (error) {
    handlePasskeyRecoveryError(dispatch, error, data);
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
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

function handlePasskeyRecoveryError(dispatch: Dispatch, error: unknown, data: RecoveryData): void {
  if (isPasskeyPlatformError(error)) {
    Logger.info('Passkey cancelled, falling back to password', { tag: 'auth' });
    dispatch({ type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: data.identityKeyName });
    return;
  }
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

function isPasskeyPlatformError(error: unknown): boolean {
  if (!(error instanceof IdentityError)) return false;
  return error.code === IdentityErrorCode.PASSKEY_CANCELLED || error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE;
}

function isInvalidRecoveryCredentials(error: unknown): boolean {
  if (!(error instanceof IdentityError)) return false;
  return error.code === IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS || error.code === IdentityErrorCode.USER_NOT_FOUND;
}
