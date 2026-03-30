import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';
import { isValidIdentityKeyName } from './validate-identity-key-name';

interface HandleRegisterDeps {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

export async function handleRegister(
  deps: HandleRegisterDeps,
  data: { identityKeyName: string; password: string },
): Promise<void> {
  const { identityClient, dispatch, onAuthSuccess } = deps;
  if (!isValidIdentityKeyName(data.identityKeyName)) {
    dispatch({ type: 'SET_ERROR', error: { code: 'UNKNOWN', userMessage: 'Invalid identity key name.' } });
    return;
  }
  const usePasskey = !data.password;
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    if (usePasskey) {
      await identityClient.registerWithPasskey(data.identityKeyName);
    } else {
      await identityClient.registerWithPassword({
        username: data.identityKeyName,
        password: data.password,
      });
    }
    onAuthSuccess(data.identityKeyName);
  } catch (error) {
    if (usePasskey && isPasskeyCancelledError(error)) {
      dispatch({ type: 'GO_TO_REGISTER' });
    }
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}

function isPasskeyCancelledError(error: unknown): boolean {
  return (
    error instanceof IdentityError &&
    (error.code === IdentityErrorCode.PASSKEY_CANCELLED ||
      error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE)
  );
}
