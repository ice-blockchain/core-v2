export { createAuthFlowStore } from './create-auth-flow-store';
export { useAuthFlowStore, useGlobalAuthFlowStore } from './use-auth-flow-store';
export { setAuthFlowStore, getAuthFlowStore } from './auth-flow-store-registry';

/** @deprecated Use store directly. Will be removed. */
export { AuthActionsProvider } from './auth-actions-provider';

/** @deprecated Use createAuthFlowStore + useAuthFlowStore instead */
export { useAuthFlow } from './use-auth-flow';
export { attemptLogin } from './attempt-login';
export { registerAccount } from './register-account';
export { loginWithPassword } from './login-with-password';
export { restoreCredentials } from './restore-credentials';
export { setNewPassword } from './set-new-password';

export type { AuthFlowStore, AuthFlowStoreState, AuthFlowStoreConfig, OperationKey, OperationState } from './auth-flow-store-types';
export type {
  AuthPhase,
  AuthFlowConfig,
  AuthFlowState,
  AuthFlowError,
  AuthScreenProps,
  GetStartedCallbacks,
  RegisterCallbacks,
  RecoveryData,
  RestoreResult,
  SetNewPasswordResult,
} from './types';
