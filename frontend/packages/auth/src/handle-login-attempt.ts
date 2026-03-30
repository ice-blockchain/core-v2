import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import type { AuthFlowAction } from './types';
import { mapIdentityError } from './error-messages';
import { isValidIdentityKeyName } from '@ion/auth-ui';

interface HandleLoginAttemptDeps {
  identityClient: IdentityClient;
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

export async function handleLoginAttempt(
  deps: HandleLoginAttemptDeps,
  identityKeyName: string,
): Promise<void> {
  if (!isValidIdentityKeyName(identityKeyName)) {
    deps.dispatch({ type: 'SET_ERROR', error: mapIdentityError(buildUserNotFoundError()) });
    return;
  }
  deps.dispatch({ type: 'SET_LOADING', isLoading: true });
  try {
    await resolveLoginRoute(deps, identityKeyName);
  } catch (error) {
    deps.dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  } finally {
    deps.dispatch({ type: 'SET_LOADING', isLoading: false });
  }
}

async function resolveLoginRoute(
  deps: HandleLoginAttemptDeps,
  identityKeyName: string,
): Promise<void> {
  const capabilities = await deps.identityClient.getLoginCapabilities(identityKeyName);
  if (!capabilities.identityFound) {
    deps.dispatch({ type: 'SET_ERROR', error: mapIdentityError(buildUserNotFoundError()) });
    return;
  }
  if (capabilities.supportsPasskey) {
    deps.dispatch({ type: 'GO_TO_VERIFY_PASSKEY', identityKeyName });
    await attemptPasskeyLogin(deps, identityKeyName, capabilities.supportsPassword);
    return;
  }
  if (capabilities.supportsPassword) {
    deps.dispatch({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName });
  }
}

function buildUserNotFoundError(): IdentityError {
  return new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'User not found');
}

async function attemptPasskeyLogin(
  deps: HandleLoginAttemptDeps,
  identityKeyName: string,
  supportsPassword: boolean,
): Promise<void> {
  const { identityClient, dispatch, onAuthSuccess } = deps;
  try {
    await identityClient.loginWithPasskey(identityKeyName);
    onAuthSuccess(identityKeyName);
  } catch (error) {
    if (isPasskeyFallbackError(error) && supportsPassword) {
      dispatch({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName });
      return;
    }
    dispatch({ type: 'SET_ERROR', error: mapIdentityError(error) });
  }
}

function isPasskeyFallbackError(error: unknown): boolean {
  return (
    error instanceof IdentityError &&
    (error.code === IdentityErrorCode.PASSKEY_CANCELLED ||
      error.code === IdentityErrorCode.PASSKEY_NOT_AVAILABLE)
  );
}
