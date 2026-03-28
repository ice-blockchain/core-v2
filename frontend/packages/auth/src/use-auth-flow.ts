import { useCallback, useReducer } from 'react';
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

  const deps = { identityClient, dispatch, onAuthSuccess };

  const screenProps = buildScreenProps(deps, state, loadingElement);
  const resetFlow = useCallback(() => dispatch({ type: 'GO_TO_GET_STARTED' }), []);
  const logout = useCallback((u: string) => identityClient.logout(u), [identityClient]);
  const isAuth = useCallback((u: string) => identityClient.isAuthenticated(u), [identityClient]);

  return { state, screenProps, logout, isAuthenticated: isAuth, resetFlow };
}

interface FlowDeps {
  identityClient: AuthFlowConfig['identityClient'];
  dispatch: (action: AuthFlowAction) => void;
  onAuthSuccess: (username: string) => void;
}

function buildScreenProps(
  deps: FlowDeps,
  state: AuthFlowState,
  loadingElement: AuthFlowConfig['loadingElement'],
): AuthScreenProps {
  return {
    getStarted: {
      onNavigateToRegister: () => deps.dispatch({ type: 'GO_TO_REGISTER' }),
      onNavigateToVerifyPassword: (name: string) => handleLoginAttempt(deps, name),
      onNavigateToRestore: () => { /* TODO: wire restore flow */ },
    },
    register: {
      onBack: () => deps.dispatch({ type: 'GO_TO_GET_STARTED' }),
      onContinue: (data) => handleRegister(deps, data),
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
        onConfirm: (password: string) => handlePasswordLogin(deps, state.identityKeyName, password),
      },
    },
  };
}
