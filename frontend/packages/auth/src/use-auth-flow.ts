import { useCallback, useReducer, useRef } from 'react';
import { isPasskeyAvailable } from '@ion/identity-client';
import type { AuthFlowAction, AuthFlowConfig, AuthFlowState, AuthScreenProps } from './types';
import { authFlowReducer, createInitialState } from './auth-flow-reducer';
import { handleLoginAttempt } from './handle-login-attempt';
import { handleRegister } from './handle-register';
import { handlePasswordLogin } from './handle-password-login';

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

function buildGetStartedProps(deps: FlowDeps, guard: GuardFn): AuthScreenProps['getStarted'] {
  return {
    onNavigateToRegister: () => deps.dispatch({ type: 'GO_TO_REGISTER' }),
    onNavigateToVerifyPassword: (name: string) => guard(() => handleLoginAttempt(deps, name)),
    onNavigateToRestore: () => { /* TODO: wire restore flow */ },
  };
}

function buildScreenProps(input: BuildScreenPropsInput): AuthScreenProps {
  const { deps, state, loadingElement, guard } = input;
  return {
    getStarted: buildGetStartedProps(deps, guard),
    register: {
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onContinue: (data) => guard(() => handleRegister(deps, data)),
      passkeyAvailable: isPasskeyAvailable(),
    },
    verifyPasskey: {
      identityKeyName: state.identityKeyName,
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onDismiss: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      loadingElement,
    },
    verifyPassword: {
      backgroundProps: { loadingElement },
      overlayProps: {
        onConfirm: (password: string) => guard(() => handlePasswordLogin(deps, state.identityKeyName, password)),
      },
    },
  };
}
