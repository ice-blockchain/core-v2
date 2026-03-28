import type { IdentityClient } from '@ion/identity-client';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';

interface HandlePasswordLoginDeps {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

export async function handlePasswordLogin(
  deps: HandlePasswordLoginDeps,
  identityKeyName: string,
  password: string,
): Promise<void> {
  const { identityClient, dispatch, onAuthSuccess } = deps;
  dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    await identityClient.loginWithPassword({ username: identityKeyName, password });
    onAuthSuccess(identityKeyName);
  } catch (error) {
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  } finally {
    dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}
