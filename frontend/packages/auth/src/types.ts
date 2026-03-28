import type { ReactNode } from 'react';
import type { IdentityClient, IdentityErrorCode } from '@ion/identity-client';

export type AuthPhase =
  | 'get-started'
  | 'register'
  | 'verify-passkey'
  | 'verify-password';

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
}

export interface AuthFlowError {
  code: IdentityErrorCode | 'UNKNOWN';
  userMessage: string;
}

export type AuthFlowAction =
  | { type: 'GO_TO_GET_STARTED' }
  | { type: 'GO_TO_REGISTER' }
  | { type: 'GO_TO_VERIFY_PASSKEY'; identityKeyName: string }
  | { type: 'GO_TO_VERIFY_PASSWORD'; identityKeyName: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: AuthFlowError }
  | { type: 'CLEAR_ERROR' };

export interface GetStartedCallbacks {
  onNavigateToRegister: () => void;
  onNavigateToVerifyPassword: (identityKeyName: string) => void;
  onNavigateToRestore: () => void;
}

export interface RegisterCallbacks {
  onBack: () => void;
  onContinue: (data: { identityKeyName: string; password: string }) => void;
}

export interface VerifyPasskeyCallbacks {
  identityKeyName: string;
  onBack: () => void;
  onDismiss: () => void;
  loadingElement: ReactNode;
}

export interface VerifyPasswordCallbacks {
  backgroundProps: { loadingElement: ReactNode };
  overlayProps: { onConfirm: (password: string) => void };
}

export interface AuthScreenProps {
  getStarted: GetStartedCallbacks;
  register: RegisterCallbacks;
  verifyPasskey: VerifyPasskeyCallbacks;
  verifyPassword: VerifyPasswordCallbacks;
}
