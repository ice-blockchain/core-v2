import { useCallback, useReducer, useRef } from 'react';
import { isPasskeyAvailable } from '@ion/identity-client';
import type { AuthFlowAction, AuthFlowConfig, AuthFlowState, AuthScreenProps } from './types';
import { authFlowReducer, createInitialState } from './auth-flow-reducer';
import { handleLoginAttempt } from './handle-login-attempt';
import { handleRegister } from './handle-register';
import { handlePasswordLogin } from './handle-password-login';
import { handleRestoreCredentials, handleSetNewPassword } from './handle-credential-restore';

interface UseAuthFlowResult {
  state: AuthFlowState;
  screenProps: AuthScreenProps;
  logout: (username: string) => Promise<void>;
  isAuthenticated: (username: string) => Promise<boolean>;
  resetFlow: () => void;
}

export function useAuthFlow(config: AuthFlowConfig): UseAuthFlowResult {
  const [state, dispatch] = useReducer(authFlowReducer, undefined, createInitialState);
  const { identityClient, onAuthSuccess, loadingElement } = config;
  const inFlight = useRef(false);

  const deps = { identityClient, dispatch, onAuthSuccess };
  const guard = createInFlightGuard(inFlight);

  const screenProps = buildScreenProps({ deps, state, loadingElement, guard });
  const resetFlow = useCallback(() => dispatch({ type: 'GO_TO_GET_STARTED' }), []);
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
  guard: GuardFn;
}

function buildGetStartedProps(deps: FlowDeps, state: AuthFlowState, guard: GuardFn): AuthScreenProps['getStarted'] {
  return {
    initialIdentityKeyName: state.identityKeyName,
    onNavigateToRegister: () => deps.dispatch({ type: 'GO_TO_REGISTER' }),
    onNavigateToVerifyPassword: (name: string) => guard(() => handleLoginAttempt(deps, name)),
    onNavigateToRestore: () => deps.dispatch({ type: 'GO_TO_RESTORE_MENU' }),
  };
}

function buildScreenProps(input: BuildScreenPropsInput): AuthScreenProps {
  const { deps, state, loadingElement, guard } = input;
  return {
    getStarted: buildGetStartedProps(deps, state, guard),
    register: {
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onContinue: (data) => guard(() => handleRegister(deps, data)),
      passkeyAvailable: isPasskeyAvailable(),
    },
    verifyPassword: {
      backgroundProps: { loadingElement },
      overlayProps: {
        onConfirm: (pw: string) => guard(() => handlePasswordLogin(deps, state.identityKeyName, pw)),
      },
    },
    ...buildRestoreProps(deps, state, guard),
  };
}

function buildRestoreProps(deps: FlowDeps, state: AuthFlowState, guard: GuardFn) {
  const { dispatch } = deps;
  return {
    restoreMenu: {
      onBack: () => dispatch({ type: 'GO_TO_GET_STARTED' }),
      onSelectCloudRestore: () => {},
      onSelectCredentialRestore: () => dispatch({ type: 'GO_TO_RESTORE_CREDENTIALS' }),
    },
    restoreCredentials: {
      onBack: () => dispatch({ type: 'GO_TO_RESTORE_MENU' }),
      onRestore: (data: { identityKeyName: string; recoveryKeyId: string; recoveryCode: string }) =>
        guard(() => handleRestoreCredentials({ identityClient: deps.identityClient, dispatch }, data)),
      isLoading: state.isLoading,
    },
    setNewPassword: {
      identityKeyName: state.identityKeyName,
      onBack: () => dispatch({ type: 'GO_TO_RESTORE_CREDENTIALS' }),
      onContinue: (password: string) => guard(() => handleSetNewPassword({
        identityClient: deps.identityClient, dispatch,
        recoveryData: { identityKeyName: state.identityKeyName, recoveryKeyId: state.recoveryKeyId, recoveryCode: state.recoveryCode },
      }, password)),
    },
    restoreSuccessModal: buildRestoreSuccessModal(dispatch, state),
    identityKeyNotFoundModal: buildIdentityKeyNotFoundModal(dispatch, state),
  };
}

function buildRestoreSuccessModal(dispatch: (action: AuthFlowAction) => void, state: AuthFlowState) {
  return {
    isVisible: state.isRestoreSuccessVisible,
    onClose: () => { dispatch({ type: 'HIDE_RESTORE_SUCCESS' }); dispatch({ type: 'GO_TO_GET_STARTED' }); },
    onLogin: () => { dispatch({ type: 'HIDE_RESTORE_SUCCESS' }); dispatch({ type: 'GO_TO_GET_STARTED', identityKeyName: state.identityKeyName }); },
  };
}

function buildIdentityKeyNotFoundModal(dispatch: (action: AuthFlowAction) => void, state: AuthFlowState) {
  return {
    isVisible: state.isIdentityKeyNotFoundVisible,
    onClose: () => { dispatch({ type: 'HIDE_IDENTITY_KEY_NOT_FOUND' }); },
  };
}
