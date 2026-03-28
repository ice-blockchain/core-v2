import type { IdentityClient } from '@ion/identity-client';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';

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
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}
