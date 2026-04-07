import { isPasskeyAvailable } from '@ion/identity-client';
import type { LoginAttemptResult, RegisterResult } from '@ion/auth-ui';
import type { RecoveryData, RestoreResult, SetNewPasswordResult } from './types';
import type { AuthFlowStore, AuthFlowStoreConfig, AuthFlowStoreState, OperationKey, OperationState } from './auth-flow-store-types';
import { createInitialStoreState } from './auth-flow-store-types';
import { resolveBackPhase, isValidTransition } from './auth-flow-store-navigation';
import { attemptLogin } from './attempt-login';
import { registerAccount } from './register-account';
import { loginWithPassword } from './login-with-password';
import { restoreCredentials as executeRestore } from './restore-credentials';
import { setNewPassword as executeSetNewPassword } from './set-new-password';

interface StoreInternals {
  getSnapshot(): AuthFlowStoreState;
  update(partial: Partial<AuthFlowStoreState>): void;
  setOperation(key: OperationKey, state: OperationState): void;
  isOperationBusy(key: OperationKey): boolean;
  markLoading(key: OperationKey): void;
  markSuccess(key: OperationKey): void;
}

function createStoreInternals(emit: () => void): StoreInternals {
  let snapshot = createInitialStoreState();

  function update(partial: Partial<AuthFlowStoreState>): void {
    snapshot = { ...snapshot, ...partial };
    emit();
  }

  return {
    getSnapshot: () => snapshot,
    update,
    setOperation(key, state) {
      update({ operations: { ...snapshot.operations, [key]: state } });
    },
    isOperationBusy(key) {
      return snapshot.operations[key].status === 'loading';
    },
    markLoading(key) {
      update({ operations: { ...snapshot.operations, [key]: { status: 'loading', error: null } } });
    },
    markSuccess(key) {
      update({ operations: { ...snapshot.operations, [key]: { status: 'success', error: null } } });
    },
  };
}

export function createAuthFlowStore(config: AuthFlowStoreConfig): AuthFlowStore {
  const listeners = new Set<() => void>();
  function emit(): void { for (const l of listeners) l(); }
  const internals = createStoreInternals(emit);

  return {
    getSnapshot: internals.getSnapshot,
    subscribe: (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    attemptLogin: (name) => handleAttemptLogin(config, internals, name),
    register: (data) => handleRegister(config, internals, data),
    loginWithPassword: (name, pw) => handlePasswordLogin(config, internals, { identityKeyName: name, password: pw }),
    restoreCredentials: (data) => handleRestore(config, internals, data),
    setNewPassword: (pw) => handleSetNewPassword(config, internals, pw),
    navigateTo: (phase, name) => navigateToPhase(internals, { phase, identityKeyName: name }),
    goBack: () => navigateBack(internals),
    reset: () => { internals.update(createInitialStoreState()); },
    dismissRestoreSuccess: () => internals.update({ isRestoreSuccessVisible: false }),
    dismissIdentityKeyNotFound: () => internals.update({ isIdentityKeyNotFoundVisible: false }),
    clearError: (key) => internals.setOperation(key, { status: 'idle', error: null }),
    isPasskeyAvailable: isPasskeyAvailable(),
  };
}

async function handleAttemptLogin(config: AuthFlowStoreConfig, s: StoreInternals, identityKeyName: string): Promise<void> {
  if (s.isOperationBusy('loginAttempt')) return;
  s.markLoading('loginAttempt');
  const result = await attemptLogin(config.identityClient, identityKeyName);
  applyLoginResult({ store: s, config, identityKeyName }, result);
}

async function handleRegister(config: AuthFlowStoreConfig, s: StoreInternals, data: { identityKeyName: string; password?: string }): Promise<void> {
  if (s.isOperationBusy('register')) return;
  s.markLoading('register');
  const result = await registerAccount(config.identityClient, data);
  applyRegisterResult({ store: s, config, identityKeyName: data.identityKeyName }, result);
}

async function handlePasswordLogin(config: AuthFlowStoreConfig, s: StoreInternals, input: { identityKeyName: string; password: string }): Promise<void> {
  if (s.isOperationBusy('passwordLogin')) return;
  s.markLoading('passwordLogin');
  const result = await loginWithPassword(config.identityClient, input.identityKeyName, input.password);
  if (result.outcome === 'authenticated') {
    s.markSuccess('passwordLogin');
    config.onAuthSuccess(input.identityKeyName);
  } else {
    s.setOperation('passwordLogin', { status: 'error', error: result.error });
  }
}

async function handleRestore(config: AuthFlowStoreConfig, s: StoreInternals, data: RecoveryData): Promise<void> {
  if (s.isOperationBusy('restore')) return;
  s.update({ recoveryData: data });
  s.markLoading('restore');
  const result = await executeRestore(config.identityClient, data);
  applyRestoreResult(s, result, data);
}

async function handleSetNewPassword(config: AuthFlowStoreConfig, s: StoreInternals, password: string): Promise<void> {
  const recoveryData = s.getSnapshot().recoveryData;
  if (s.isOperationBusy('setNewPassword') || !recoveryData) return;
  s.markLoading('setNewPassword');
  const result = await executeSetNewPassword(config.identityClient, recoveryData, password);
  applyRecoveryResult(s, 'setNewPassword', result);
}

function navigateToPhase(s: StoreInternals, input: { phase: string; identityKeyName?: string | undefined }): void {
  const current = s.getSnapshot().phase;
  if (!isValidTransition(current, input.phase as never)) return;
  const changes: Partial<AuthFlowStoreState> = { phase: input.phase as never };
  if (input.identityKeyName !== undefined) changes.identityKeyName = input.identityKeyName;
  s.update(changes);
}

function navigateBack(s: StoreInternals): void {
  const target = resolveBackPhase(s.getSnapshot().phase);
  if (!target) return;
  const changes: Partial<AuthFlowStoreState> = { phase: target };
  if (target === 'restore-credentials') changes.recoveryData = null;
  s.update(changes);
}

interface ApplyResultContext {
  store: StoreInternals;
  config: AuthFlowStoreConfig;
  identityKeyName: string;
}

function applyLoginResult(ctx: ApplyResultContext, result: LoginAttemptResult): void {
  if (result.outcome === 'authenticated') {
    ctx.store.markSuccess('loginAttempt');
    ctx.config.onAuthSuccess(ctx.identityKeyName);
  } else if (result.outcome === 'needs-password') {
    ctx.store.setOperation('loginAttempt', { status: 'idle', error: null });
    ctx.store.update({ phase: 'verify-password', identityKeyName: result.identityKeyName });
  } else {
    ctx.store.setOperation('loginAttempt', { status: 'error', error: result.error });
  }
}

function applyRegisterResult(ctx: ApplyResultContext, result: RegisterResult): void {
  if (result.outcome === 'authenticated') {
    ctx.store.markSuccess('register');
    ctx.config.onAuthSuccess(ctx.identityKeyName);
  } else if (result.outcome === 'cancelled') {
    ctx.store.setOperation('register', { status: 'idle', error: null });
  } else {
    ctx.store.setOperation('register', { status: 'error', error: result.error });
  }
}

function applyRestoreResult(s: StoreInternals, result: RestoreResult, data: RecoveryData): void {
  if (result.outcome === 'restored') {
    s.markSuccess('restore');
    s.update({ isRestoreSuccessVisible: true });
  } else if (result.outcome === 'needs-password') {
    s.setOperation('restore', { status: 'idle', error: null });
    s.update({ phase: 'set-new-password', identityKeyName: data.identityKeyName });
  } else if (result.outcome === 'invalid-credentials') {
    s.setOperation('restore', { status: 'idle', error: null });
    s.update({ isIdentityKeyNotFoundVisible: true });
  } else {
    s.setOperation('restore', { status: 'error', error: result.error });
  }
}

function applyRecoveryResult(s: StoreInternals, key: OperationKey, result: SetNewPasswordResult): void {
  if (result.outcome === 'restored') {
    s.markSuccess(key);
    s.update({ isRestoreSuccessVisible: true });
  } else if (result.outcome === 'invalid-credentials') {
    s.setOperation(key, { status: 'idle', error: null });
    s.update({ isIdentityKeyNotFoundVisible: true });
  } else {
    s.setOperation(key, { status: 'error', error: result.error });
  }
}
