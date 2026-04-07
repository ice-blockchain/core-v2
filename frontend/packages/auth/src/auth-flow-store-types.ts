import type { IdentityClient } from '@ion/identity-client';
import type { AuthPhase, RecoveryData } from './types';

export type OperationKey = 'loginAttempt' | 'register' | 'passwordLogin' | 'restore' | 'setNewPassword';

export interface OperationError {
  code: string;
  numericCode: string;
  userMessage: string;
}

export interface OperationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: OperationError | null;
}

export interface AuthFlowStoreState {
  phase: AuthPhase;
  identityKeyName: string;
  operations: Record<OperationKey, OperationState>;
  recoveryData: RecoveryData | null;
  isRestoreSuccessVisible: boolean;
  isIdentityKeyNotFoundVisible: boolean;
}

export interface AuthFlowStore {
  getSnapshot(): AuthFlowStoreState;
  subscribe(listener: () => void): () => void;

  attemptLogin(identityKeyName: string): Promise<void>;
  register(data: { identityKeyName: string; password?: string }): Promise<void>;
  loginWithPassword(identityKeyName: string, password: string): Promise<void>;
  restoreCredentials(data: RecoveryData): Promise<void>;
  setNewPassword(password: string): Promise<void>;

  navigateTo(phase: AuthPhase, identityKeyName?: string): void;
  goBack(): void;
  reset(): void;

  dismissRestoreSuccess(): void;
  dismissIdentityKeyNotFound(): void;
  clearError(operationKey: OperationKey): void;

  isPasskeyAvailable: boolean;
}

export interface AuthFlowStoreConfig {
  identityClient: IdentityClient;
  onAuthSuccess: (username: string) => void;
}

const IDLE_OPERATION: OperationState = { status: 'idle', error: null };

export function createInitialOperations(): Record<OperationKey, OperationState> {
  return {
    loginAttempt: { ...IDLE_OPERATION },
    register: { ...IDLE_OPERATION },
    passwordLogin: { ...IDLE_OPERATION },
    restore: { ...IDLE_OPERATION },
    setNewPassword: { ...IDLE_OPERATION },
  };
}

export function createInitialStoreState(): AuthFlowStoreState {
  return {
    phase: 'get-started',
    identityKeyName: '',
    operations: createInitialOperations(),
    recoveryData: null,
    isRestoreSuccessVisible: false,
    isIdentityKeyNotFoundVisible: false,
  };
}
