import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode, isPasskeyAvailable } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';

type RecoveryData = { identityKeyName: string; recoveryKeyId: string; recoveryCode: string };
type Dispatch = (action: AuthFlowAction) => void;

export function handleRestoreCredentialsSubmit(
  dispatch: Dispatch,
  data: RecoveryData,
): void {
  dispatch({ type: 'GO_TO_SET_NEW_PASSWORD', ...data });
}

export async function handleRestoreCredentials(
  input: { identityClient: IdentityClient; dispatch: Dispatch },
  data: RecoveryData,
): Promise<void> {
  const { identityClient, dispatch } = input;
  dispatch({ type: 'STORE_RECOVERY_DATA', ...data });
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    if (!isPasskeyAvailable()) {
      dispatch({ type: 'GO_TO_SET_NEW_PASSWORD', ...data });
      return;
    }
    await callPasskeyRecovery(identityClient, data);
    Logger.warning('Passkey recovery succeeded', { tag: 'auth', data: { identityKeyName: data.identityKeyName } });
    dispatch({ type: 'SHOW_RESTORE_SUCCESS' });
  } catch (error) {
    handlePasskeyRecoveryError(dispatch, error, data);
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}

export interface SetNewPasswordInput {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  recoveryData: { identityKeyName: string; recoveryKeyId: string; recoveryCode: string };
}

export async function handleSetNewPassword(input: SetNewPasswordInput, newPassword: string): Promise<void> {
  const { identityClient, dispatch, recoveryData } = input;
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    await callRecoverAccount(identityClient, recoveryData, newPassword);
    Logger.warning('Password recovery succeeded', { tag: 'auth', data: { identityKeyName: recoveryData.identityKeyName } });
    dispatch({ type: 'SHOW_RESTORE_SUCCESS' });
  } catch (error) {
    handleRecoveryError(dispatch, error, recoveryData.identityKeyName);
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
    Logger.warning('Passkey cancelled, falling back to password', { tag: 'auth', data: { identityKeyName: data.identityKeyName } });
    dispatch({ type: 'GO_TO_SET_NEW_PASSWORD', ...data });
    return;
  }
  logRecoveryError(error, data.identityKeyName);
  if (isInvalidRecoveryCredentials(error)) {
    dispatch({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
  } else {
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
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

function handleRecoveryError(dispatch: Dispatch, error: unknown, identityKeyName: string): void {
  logRecoveryError(error, identityKeyName);
  if (isInvalidRecoveryCredentials(error)) {
    dispatch({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
  } else {
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  }
}

function logRecoveryError(error: unknown, identityKeyName: string): void {
  Logger.error('Account recovery failed', {
    tag: 'auth',
    error: error instanceof Error ? error : new Error(String(error)),
    data: { identityKeyName },
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
