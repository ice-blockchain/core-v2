import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';
import { isValidIdentityKeyName } from '@ion/auth-ui';

interface HandleRegisterDeps {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

export async function handleRegister(
  deps: HandleRegisterDeps,
  data: { identityKeyName: string; password?: string },
): Promise<void> {
  const { dispatch } = deps;
  if (!isValidIdentityKeyName(data.identityKeyName)) {
    dispatch({ type: 'SET_ERROR', error: { code: 'UNKNOWN', userMessage: 'Invalid identity key name.' } });
    return;
  }
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    await executeRegistration(deps, data);
  } catch (error) {
    Logger.error('Registration failed', { tag: 'auth', error: error instanceof Error ? error : new Error(String(error)), data: { identityKeyName: data.identityKeyName } });
    if ((data.password === undefined || data.password === null) && isPasskeyCancelledError(error)) {
      dispatch({ type: 'GO_TO_REGISTER' });
      return;
    }
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}

async function executeRegistration(
  deps: HandleRegisterDeps,
  data: { identityKeyName: string; password?: string },
): Promise<void> {
  const { identityClient, onAuthSuccess } = deps;
  const usePasskey = data.password === undefined || data.password === null;
  if (usePasskey) {
    await identityClient.registerWithPasskey(data.identityKeyName);
  } else {
    await identityClient.registerWithPassword({ username: data.identityKeyName, password: data.password });
  }
  onAuthSuccess(data.identityKeyName);
}

function isPasskeyCancelledError(error: unknown): boolean {
  return (
    error instanceof IdentityError &&
    (error.code === IdentityErrorCode.PASSKEY_CANCELLED ||
      error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE)
  );
}

