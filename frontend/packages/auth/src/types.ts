import type { ReactNode } from 'react';
import type { IdentityClient, IdentityErrorCode } from '@ion/identity-client';

export type AuthPhase =
  | 'get-started'
  | 'register'
  | 'verify-password'
  | 'restore-menu'
  | 'restore-credentials'
  | 'set-new-password';

export interface AuthFlowConfig {
  identityClient: IdentityClient;
  onAuthSuccess: (username: string) => void;
  loadingElement: ReactNode;
}

export interface AuthFlowState {
  phase: AuthPhase;
  identityKeyName: string;
  isLoading: boolean;
  error: AuthFlowError | null;
  isRestoreSuccessVisible: boolean;
  isIdentityKeyNotFoundVisible: boolean;
}

export interface AuthFlowError {
  code: IdentityErrorCode | 'UNKNOWN';
  userMessage: string;
}

export type AuthFlowAction =
  | { type: 'GO_TO_GET_STARTED'; identityKeyName?: string }
  | { type: 'GO_TO_REGISTER' }
  | { type: 'GO_TO_VERIFY_PASSWORD'; identityKeyName: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: AuthFlowError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'GO_TO_RESTORE_MENU' }
  | { type: 'GO_TO_RESTORE_CREDENTIALS' }
  | { type: 'GO_TO_SET_NEW_PASSWORD'; identityKeyName: string }
  | { type: 'GO_BACK_FROM_SET_NEW_PASSWORD' }
  | { type: 'SHOW_RESTORE_SUCCESS' }
  | { type: 'HIDE_RESTORE_SUCCESS' }
  | { type: 'SHOW_IDENTITY_KEY_NOT_FOUND' }
  | { type: 'HIDE_IDENTITY_KEY_NOT_FOUND' };

export interface GetStartedCallbacks {
  initialIdentityKeyName: string;
  onNavigateToRegister: () => void;
  onNavigateToVerifyPassword: (identityKeyName: string) => void;
  onNavigateToRestore: () => void;
}

export interface RegisterCallbacks {
  onBack: () => void;
  onContinue: (data: { identityKeyName: string; password?: string }) => void;
  passkeyAvailable: boolean;
}

export interface VerifyPasswordCallbacks {
  backgroundProps: { loadingElement: ReactNode };
  overlayProps: { onConfirm: (password: string) => void };
}

export interface RestoreMenuCallbacks {
  onBack: () => void;
  onSelectCloudRestore: () => void;
  onSelectCredentialRestore: () => void;
}

export interface RestoreCredentialsCallbacks {
  onBack: () => void;
  onRestore: (data: { identityKeyName: string; recoveryKeyId: string; recoveryCode: string }) => void;
  isLoading: boolean;
}

export interface SetNewPasswordCallbacks {
  identityKeyName: string;
  onBack: () => void;
  onContinue: (password: string) => void;
}

export interface RestoreSuccessModalCallbacks {
  isVisible: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export interface IdentityKeyNotFoundModalCallbacks {
  isVisible: boolean;
  onClose: () => void;
}

export interface AuthScreenProps {
  getStarted: GetStartedCallbacks;
  register: RegisterCallbacks;
  verifyPassword: VerifyPasswordCallbacks;
  restoreMenu: RestoreMenuCallbacks;
  restoreCredentials: RestoreCredentialsCallbacks;
  setNewPassword: SetNewPasswordCallbacks;
  restoreSuccessModal: RestoreSuccessModalCallbacks;
  identityKeyNotFoundModal: IdentityKeyNotFoundModalCallbacks;
}
