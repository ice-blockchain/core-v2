import type { AuthFlowState, AuthFlowAction } from './types';

export function createInitialState(): AuthFlowState {
  return { phase: 'get-started', identityKeyName: '', isLoading: false, error: null };
}

export function authFlowReducer(state: AuthFlowState, action: AuthFlowAction): AuthFlowState {
  switch (action.type) {
    case 'GO_TO_GET_STARTED':
      return { ...state, phase: 'get-started', identityKeyName: '', error: null };
    case 'GO_TO_REGISTER':
      return { ...state, phase: 'register', error: null };
    case 'GO_TO_VERIFY_PASSKEY':
      return { ...state, phase: 'verify-passkey', identityKeyName: action.identityKeyName, error: null };
    case 'GO_TO_VERIFY_PASSWORD':
      return { ...state, phase: 'verify-password', identityKeyName: action.identityKeyName, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
  }
}
