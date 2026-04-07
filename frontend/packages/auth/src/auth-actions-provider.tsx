import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { IdentityClient } from '@ion/identity-client';
import { AuthActionsContext } from '@ion/auth-ui';
import type { AuthActions, LoginAttemptResult, RegisterResult, PasswordLoginResult } from '@ion/auth-ui';
import { attemptLogin } from './attempt-login';
import { registerAccount } from './register-account';
import { loginWithPassword } from './login-with-password';

interface AuthActionsProviderProps {
  identityClient: IdentityClient;
  onAuthSuccess: (username: string) => void;
  children: ReactNode;
}

function useInFlightGuard() {
  const ref = useRef(false);
  return { ref };
}

async function guardedCall<TResult>(
  ref: React.RefObject<boolean>,
  action: () => Promise<TResult>,
): Promise<TResult | null> {
  if (ref.current) return null;
  ref.current = true;
  try {
    return await action();
  } finally {
    ref.current = false;
  }
}

function useAuthActionsValue(
  identityClient: IdentityClient,
  onAuthSuccess: (username: string) => void,
): AuthActions {
  const { ref } = useInFlightGuard();

  const wrappedAttemptLogin = useCallback(
    (name: string) => guardedCall(ref, () => attemptLogin(identityClient, name)) as Promise<LoginAttemptResult>,
    [identityClient, ref],
  );

  const wrappedRegister = useCallback(
    (data: { identityKeyName: string; password?: string }) =>
      guardedCall(ref, () => registerAccount(identityClient, data)) as Promise<RegisterResult>,
    [identityClient, ref],
  );

  const wrappedPasswordLogin = useCallback(
    (name: string, password: string) =>
      guardedCall(ref, () => loginWithPassword(identityClient, name, password)) as Promise<PasswordLoginResult>,
    [identityClient, ref],
  );

  return useMemo(() => ({
    attemptLogin: wrappedAttemptLogin,
    registerAccount: wrappedRegister,
    loginWithPassword: wrappedPasswordLogin,
    onAuthSuccess,
  }), [wrappedAttemptLogin, wrappedRegister, wrappedPasswordLogin, onAuthSuccess]);
}

export function AuthActionsProvider({ identityClient, onAuthSuccess, children }: AuthActionsProviderProps) {
  const actions = useAuthActionsValue(identityClient, onAuthSuccess);

  return (
    <AuthActionsContext.Provider value={actions}>
      {children}
    </AuthActionsContext.Provider>
  );
}
