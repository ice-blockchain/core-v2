import type { AuthFlowState, AuthFlowAction } from './types';

export function createInitialState(): AuthFlowState {
  return {
    phase: 'get-started',
    identityKeyName: '',
    isLoading: false,
    error: null,
    isRestoreSuccessVisible: false,
    isIdentityKeyNotFoundVisible: false,
  };
}

const CLEARED_FLAGS = { isRestoreSuccessVisible: false, isIdentityKeyNotFoundVisible: false };

export function authFlowReducer(state: AuthFlowState, action: AuthFlowAction): AuthFlowState {
  switch (action.type) {
    case 'GO_TO_GET_STARTED':
      return { ...state, phase: 'get-started', identityKeyName: action.identityKeyName ?? '', error: null, ...CLEARED_FLAGS };
    case 'GO_TO_REGISTER':
      if (state.phase !== 'get-started') return state;
      return { ...state, phase: 'register', error: null };
    case 'GO_TO_VERIFY_PASSWORD':
      if (state.phase !== 'get-started') return state;
      return { ...state, phase: 'verify-password', identityKeyName: action.identityKeyName, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return reduceRestoreActions(state, action);
  }
}

function reduceRestoreActions(state: AuthFlowState, action: AuthFlowAction): AuthFlowState {
  switch (action.type) {
    case 'GO_TO_RESTORE_MENU':
      if (state.phase !== 'get-started') return state;
      return { ...state, phase: 'restore-menu', error: null };
    case 'GO_TO_RESTORE_CREDENTIALS':
      if (state.phase !== 'restore-menu') return state;
      return { ...state, phase: 'restore-credentials', error: null };
    case 'GO_TO_SET_NEW_PASSWORD':
      if (state.phase !== 'restore-credentials') return state;
      return { ...state, phase: 'set-new-password', identityKeyName: action.identityKeyName, error: null };
    case 'GO_BACK_FROM_SET_NEW_PASSWORD':
      if (state.phase !== 'set-new-password') return state;
      return { ...state, phase: 'restore-credentials', error: null, isLoading: false };
    case 'SHOW_RESTORE_SUCCESS':
      if (state.phase !== 'set-new-password' && state.phase !== 'restore-credentials') return state;
      return { ...state, isRestoreSuccessVisible: true };
    case 'HIDE_RESTORE_SUCCESS':
      return { ...state, isRestoreSuccessVisible: false };
    case 'SHOW_IDENTITY_KEY_NOT_FOUND':
      if (state.phase !== 'restore-credentials' && state.phase !== 'set-new-password') return state;
      return { ...state, isIdentityKeyNotFoundVisible: true };
    case 'HIDE_IDENTITY_KEY_NOT_FOUND':
      return { ...state, isIdentityKeyNotFoundVisible: false };
    default:
      return state;
  }
}
