import { useCallback, useReducer, useRef } from 'react';
import { isPasskeyAvailable } from '@ion/identity-client';
import type { AuthFlowAction, AuthFlowConfig, AuthFlowState, AuthScreenProps } from './types';
import { authFlowReducer, createInitialState } from './auth-flow-reducer';
import { handleLoginAttempt } from './handle-login-attempt';
import { handleRegister } from './handle-register';
import { handlePasswordLogin } from './handle-password-login';
import { handleRestoreCredentials } from './handle-restore-credentials';
import { handleSetNewPassword } from './handle-set-new-password';

interface UseAuthFlowResult {
  state: AuthFlowState;
  screenProps: AuthScreenProps;
  logout: (username: string) => Promise<void>;
  isAuthenticated: (username: string) => Promise<boolean>;
  resetFlow: () => void;
}

type RecoveryData = { identityKeyName: string; recoveryKeyId: string; recoveryCode: string };

export function useAuthFlow(config: AuthFlowConfig): UseAuthFlowResult {
  const [state, dispatch] = useReducer(authFlowReducer, undefined, createInitialState);
  const { identityClient, onAuthSuccess, loadingElement } = config;
  const recoveryDataRef = useRef<RecoveryData | null>(null);

  const registerInFlight = useRef(false);
  const loginInFlight = useRef(false);
  const restoreInFlight = useRef(false);

  const deps = { identityClient, dispatch, onAuthSuccess };
  const registerGuard = createInFlightGuard(registerInFlight);
  const loginGuard = createInFlightGuard(loginInFlight);
  const restoreGuard = createInFlightGuard(restoreInFlight);

  const screenProps = buildScreenProps({ deps, state, loadingElement, registerGuard, loginGuard, restoreGuard, recoveryDataRef });

  const resetFlow = useCallback(() => {
    recoveryDataRef.current = null;
    dispatch({ type: 'GO_TO_GET_STARTED' });
  }, []);

  const logout = useCallback((u: string) => identityClient.logout(u), [identityClient]);
  const isAuth = useCallback((u: string) => identityClient.isAuthenticated(u), [identityClient]);

  return { state, screenProps, logout, isAuthenticated: isAuth, resetFlow };
}

type AsyncAction = () => Promise<void>;
type GuardFn = (action: AsyncAction) => Promise<void>;

function createInFlightGuard(ref: React.RefObject<boolean>): GuardFn {
  return async (action) => {
    if (ref.current) return;
    ref.current = true;
    try {
      await action();
    } finally {
      ref.current = false;
    }
  };
}

interface FlowDeps {
  identityClient: AuthFlowConfig['identityClient'];
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

interface BuildScreenPropsInput {
  deps: FlowDeps;
  state: AuthFlowState;
  loadingElement: AuthFlowConfig['loadingElement'];
  registerGuard: GuardFn;
  loginGuard: GuardFn;
  restoreGuard: GuardFn;
  recoveryDataRef: React.RefObject<RecoveryData | null>;
}

function buildGetStartedProps(deps: FlowDeps, state: AuthFlowState, loginGuard: GuardFn): AuthScreenProps['getStarted'] {
  return {
    initialIdentityKeyName: state.identityKeyName,
    onNavigateToRegister: () => deps.dispatch({ type: 'GO_TO_REGISTER' }),
    onNavigateToVerifyPassword: (name: string) => loginGuard(() => handleLoginAttempt(deps, name)),
    onNavigateToRestore: () => deps.dispatch({ type: 'GO_TO_RESTORE_MENU' }),
  };
}

function buildScreenProps(input: BuildScreenPropsInput): AuthScreenProps {
  const { deps, state, loadingElement, registerGuard, loginGuard, restoreGuard, recoveryDataRef } = input;
  return {
    getStarted: buildGetStartedProps(deps, state, loginGuard),
    register: {
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onContinue: (data) => registerGuard(() => handleRegister(deps, data)),
      isPasskeyAvailable: isPasskeyAvailable(),
    },
    verifyPassword: {
      backgroundProps: { loadingElement },
      overlayProps: {
        onConfirm: (pw: string) => loginGuard(() => handlePasswordLogin(deps, state.identityKeyName, pw)),
      },
    },
    ...buildRestoreProps({ deps, state, restoreGuard, recoveryDataRef }),
  };
}

interface RestorePropsInput {
  deps: FlowDeps;
  state: AuthFlowState;
  restoreGuard: GuardFn;
  recoveryDataRef: React.RefObject<RecoveryData | null>;
}

function buildRestoreCredentialsProps(input: RestorePropsInput) {
  const { deps, state, restoreGuard, recoveryDataRef } = input;
  return {
    onBack: () => deps.dispatch({ type: 'GO_TO_RESTORE_MENU' }),
    onRestore: (data: RecoveryData) =>
      restoreGuard(() => handleRestoreCredentials({
        identityClient: deps.identityClient,
        dispatch: deps.dispatch,
        onRecoveryData: (d) => { recoveryDataRef.current = d; },
      }, data)),
    isLoading: state.isLoading,
  };
}

function buildSetNewPasswordProps(input: RestorePropsInput) {
  const { deps, state, restoreGuard, recoveryDataRef } = input;
  return {
    identityKeyName: state.identityKeyName,
    onBack: () => {
      recoveryDataRef.current = null;
      deps.dispatch({ type: 'GO_BACK_FROM_SET_NEW_PASSWORD' });
    },
    onContinue: (password: string) => restoreGuard(() => {
      const rd = recoveryDataRef.current;
      if (!rd) {
        deps.dispatch({ type: 'SET_ERROR', error: { code: 'UNKNOWN', userMessage: 'Recovery session expired. Please try again.' } });
        deps.dispatch({ type: 'GO_TO_GET_STARTED' });
        return Promise.resolve();
      }
      return handleSetNewPassword({ identityClient: deps.identityClient, dispatch: deps.dispatch, recoveryData: rd }, password);
    }),
  };
}

function buildRestoreProps(input: RestorePropsInput) {
  const { deps, state } = input;
  return {
    restoreMenu: {
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onSelectCloudRestore: () => {},
      onSelectCredentialRestore: () => deps.dispatch({ type: 'GO_TO_RESTORE_CREDENTIALS' }),
    },
    restoreCredentials: buildRestoreCredentialsProps(input),
    setNewPassword: buildSetNewPasswordProps(input),
    restoreSuccessModal: buildRestoreSuccessModal(deps.dispatch, state, input.recoveryDataRef),
    identityKeyNotFoundModal: buildIdentityKeyNotFoundModal(deps.dispatch, state),
  };
}

function buildRestoreSuccessModal(
  dispatch: (action: AuthFlowAction) => void,
  state: AuthFlowState,
  recoveryDataRef: React.RefObject<RecoveryData | null>,
) {
  return {
    isVisible: state.isRestoreSuccessVisible,
    onClose: () => { recoveryDataRef.current = null; dispatch({ type: 'HIDE_RESTORE_SUCCESS' }); dispatch({ type: 'GO_TO_GET_STARTED' }); },
    onLogin: () => { recoveryDataRef.current = null; dispatch({ type: 'HIDE_RESTORE_SUCCESS' }); dispatch({ type: 'GO_TO_GET_STARTED', identityKeyName: state.identityKeyName }); },
  };
}

function buildIdentityKeyNotFoundModal(dispatch: (action: AuthFlowAction) => void, state: AuthFlowState) {
  return {
    isVisible: state.isIdentityKeyNotFoundVisible,
    onClose: () => { dispatch({ type: 'HIDE_IDENTITY_KEY_NOT_FOUND' }); },
  };
}
