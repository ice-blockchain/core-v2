import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { AuthActionsContext } from '@ion/auth-ui';
import type { AuthActions, LoginAttemptResult, RegisterResult, PasswordLoginResult } from '@ion/auth-ui';
import type { AuthFlowStore } from './auth-flow-store-types';

interface AuthActionsProviderProps {
  store: AuthFlowStore;
  onAuthSuccess: (username: string) => void;
  children: ReactNode;
}

function useStoreOperations(store: AuthFlowStore) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return state.operations;
}

function useWrappedOperations(store: AuthFlowStore) {
  const wrappedAttemptLogin = useCallback(
    async (identityKeyName: string): Promise<LoginAttemptResult> => {
      await store.attemptLogin(identityKeyName);
      return readLoginResult(store, identityKeyName);
    },
    [store],
  );

  const wrappedRegister = useCallback(
    async (data: { identityKeyName: string; password?: string }): Promise<RegisterResult> => {
      await store.register(data);
      return readRegisterResult(store);
    },
    [store],
  );

  const wrappedPasswordLogin = useCallback(
    async (identityKeyName: string, password: string): Promise<PasswordLoginResult> => {
      await store.loginWithPassword(identityKeyName, password);
      return readPasswordLoginResult(store);
    },
    [store],
  );

  return { wrappedAttemptLogin, wrappedRegister, wrappedPasswordLogin };
}

function useAuthActionsValue(store: AuthFlowStore, onAuthSuccess: (username: string) => void): AuthActions {
  const operations = useStoreOperations(store);
  const { wrappedAttemptLogin, wrappedRegister, wrappedPasswordLogin } = useWrappedOperations(store);

  return useMemo(() => ({
    attemptLogin: wrappedAttemptLogin,
    registerAccount: wrappedRegister,
    loginWithPassword: wrappedPasswordLogin,
    isPasskeyAvailable: () => store.isPasskeyAvailable,
    onAuthSuccess,
    isLoginAttemptLoading: operations.loginAttempt.status === 'loading',
    isRegisterLoading: operations.register.status === 'loading',
    isPasswordLoginLoading: operations.passwordLogin.status === 'loading',
  }), [wrappedAttemptLogin, wrappedRegister, wrappedPasswordLogin, onAuthSuccess, store, operations]);
}

export function AuthActionsProvider({ store, onAuthSuccess, children }: AuthActionsProviderProps) {
  const actions = useAuthActionsValue(store, onAuthSuccess);
  return <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>;
}

function readLoginResult(store: AuthFlowStore, identityKeyName: string): LoginAttemptResult {
  const { operations, phase } = store.getSnapshot();
  const op = operations.loginAttempt;
  if (op.status === 'success') return { outcome: 'authenticated' };
  if (op.status === 'error' && op.error) return { outcome: 'error', error: op.error };
  if (phase === 'verify-password') return { outcome: 'needs-password', identityKeyName };
  return { outcome: 'authenticated' };
}

function readRegisterResult(store: AuthFlowStore): RegisterResult {
  const op = store.getSnapshot().operations.register;
  if (op.status === 'success') return { outcome: 'authenticated' };
  if (op.status === 'error' && op.error) return { outcome: 'error', error: op.error };
  return { outcome: 'cancelled' };
}

function readPasswordLoginResult(store: AuthFlowStore): PasswordLoginResult {
  const op = store.getSnapshot().operations.passwordLogin;
  if (op.status === 'success') return { outcome: 'authenticated' };
  if (op.status === 'error' && op.error) return { outcome: 'error', error: op.error };
  return { outcome: 'authenticated' };
}
