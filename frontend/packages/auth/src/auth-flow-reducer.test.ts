import { describe, it, expect } from 'vitest';
import { IdentityErrorCode } from '@ion/identity-client';
import { authFlowReducer, createInitialState } from './auth-flow-reducer';
import type { AuthFlowState, AuthFlowError } from './types';

const TEST_ERROR: AuthFlowError = { code: IdentityErrorCode.NETWORK_ERROR, numericCode: '602', userMessage: 'Connection failed.' };

describe('createInitialState', () => {
  it('returns get-started phase with no loading or error', () => {
    const state = createInitialState();
    expect(state).toEqual({
      phase: 'get-started',
      identityKeyName: '',
      isLoading: false,
      error: null,
      isRestoreSuccessVisible: false,
      isIdentityKeyNotFoundVisible: false,
    });
  });
});

describe('authFlowReducer', () => {
  it('GO_TO_GET_STARTED resets to initial phase and clears error', () => {
    const state: AuthFlowState = {
      ...createInitialState(),
      phase: 'register', identityKeyName: 'alice', error: TEST_ERROR,
    };
    const next = authFlowReducer(state, { type: 'GO_TO_GET_STARTED' });
    expect(next.phase).toBe('get-started');
    expect(next.identityKeyName).toBe('');
    expect(next.error).toBeNull();
  });

  it('GO_TO_GET_STARTED preserves identityKeyName when provided', () => {
    const state: AuthFlowState = {
      ...createInitialState(),
      phase: 'set-new-password',
      identityKeyName: 'alice',
    };
    const next = authFlowReducer(state, { type: 'GO_TO_GET_STARTED', identityKeyName: 'alice' });
    expect(next.phase).toBe('get-started');
    expect(next.identityKeyName).toBe('alice');
    expect(next.error).toBeNull();
  });

  it('GO_TO_GET_STARTED clears all restore visibility flags', () => {
    const state: AuthFlowState = {
      ...createInitialState(),
      phase: 'set-new-password',
      identityKeyName: 'alice',
      isRestoreSuccessVisible: true,
      isIdentityKeyNotFoundVisible: true,
    };
    const next = authFlowReducer(state, { type: 'GO_TO_GET_STARTED' });
    expect(next.isRestoreSuccessVisible).toBe(false);
    expect(next.isIdentityKeyNotFoundVisible).toBe(false);
  });

  it('GO_TO_REGISTER transitions to register and clears error', () => {
    const state: AuthFlowState = { ...createInitialState(), error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'GO_TO_REGISTER' });
    expect(next.phase).toBe('register');
    expect(next.error).toBeNull();
  });

  it('GO_TO_VERIFY_PASSWORD sets phase and identityKeyName, clears error', () => {
    const state: AuthFlowState = { ...createInitialState(), error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'carol' });
    expect(next.phase).toBe('verify-password');
    expect(next.identityKeyName).toBe('carol');
    expect(next.error).toBeNull();
  });

  it('SET_LOADING updates isLoading without changing other state', () => {
    const state = createInitialState();
    const next = authFlowReducer(state, { type: 'SET_LOADING', isLoading: true });
    expect(next.isLoading).toBe(true);
    expect(next.phase).toBe('get-started');
    expect(next.error).toBeNull();
  });

  it('SET_ERROR sets the error object', () => {
    const state = createInitialState();
    const next = authFlowReducer(state, { type: 'SET_ERROR', error: TEST_ERROR });
    expect(next.error).toEqual(TEST_ERROR);
  });

  it('CLEAR_ERROR removes the error', () => {
    const state: AuthFlowState = { ...createInitialState(), error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'CLEAR_ERROR' });
    expect(next.error).toBeNull();
  });

  it('preserves isLoading when transitioning phases', () => {
    const state: AuthFlowState = { ...createInitialState(), isLoading: true };
    const next = authFlowReducer(state, { type: 'GO_TO_REGISTER' });
    expect(next.isLoading).toBe(true);
  });

  it('GO_TO_REGISTER is ignored from non-get-started phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'verify-password', identityKeyName: 'alice' };
    const next = authFlowReducer(state, { type: 'GO_TO_REGISTER' });
    expect(next.phase).toBe('verify-password');
  });

  it('GO_TO_VERIFY_PASSWORD is ignored from register phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'register' };
    const next = authFlowReducer(state, { type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'alice' });
    expect(next.phase).toBe('register');
  });

  it('GO_TO_RESTORE_MENU transitions from get-started', () => {
    const next = authFlowReducer(createInitialState(), { type: 'GO_TO_RESTORE_MENU' });
    expect(next.phase).toBe('restore-menu');
    expect(next.error).toBeNull();
  });

  it('GO_TO_RESTORE_MENU is ignored from non-get-started phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'register' };
    const next = authFlowReducer(state, { type: 'GO_TO_RESTORE_MENU' });
    expect(next.phase).toBe('register');
  });

  it('GO_TO_RESTORE_CREDENTIALS transitions from restore-menu', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'restore-menu' };
    const next = authFlowReducer(state, { type: 'GO_TO_RESTORE_CREDENTIALS' });
    expect(next.phase).toBe('restore-credentials');
    expect(next.error).toBeNull();
  });

  it('GO_TO_RESTORE_CREDENTIALS is ignored from non-restore-menu phase', () => {
    const next = authFlowReducer(createInitialState(), { type: 'GO_TO_RESTORE_CREDENTIALS' });
    expect(next.phase).toBe('get-started');
  });

  it('GO_TO_SET_NEW_PASSWORD transitions from restore-credentials', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'restore-credentials' };
    const next = authFlowReducer(state, { type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: 'alice' });
    expect(next.phase).toBe('set-new-password');
    expect(next.error).toBeNull();
  });

  it('GO_TO_SET_NEW_PASSWORD is ignored from non-restore-credentials phase', () => {
    const next = authFlowReducer(createInitialState(), { type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: 'alice' });
    expect(next.phase).toBe('get-started');
  });

  it('GO_BACK_FROM_SET_NEW_PASSWORD returns to restore-credentials', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'set-new-password', isLoading: true, error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'GO_BACK_FROM_SET_NEW_PASSWORD' });
    expect(next.phase).toBe('restore-credentials');
    expect(next.error).toBeNull();
    expect(next.isLoading).toBe(false);
  });

  it('GO_BACK_FROM_SET_NEW_PASSWORD is ignored from non-set-new-password phase', () => {
    const next = authFlowReducer(createInitialState(), { type: 'GO_BACK_FROM_SET_NEW_PASSWORD' });
    expect(next.phase).toBe('get-started');
  });

  it('SHOW_RESTORE_SUCCESS sets flag from set-new-password phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'set-new-password' };
    const next = authFlowReducer(state, { type: 'SHOW_RESTORE_SUCCESS' });
    expect(next.isRestoreSuccessVisible).toBe(true);
  });

  it('SHOW_RESTORE_SUCCESS sets flag from restore-credentials phase when loading', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'restore-credentials', isLoading: true };
    const next = authFlowReducer(state, { type: 'SHOW_RESTORE_SUCCESS' });
    expect(next.isRestoreSuccessVisible).toBe(true);
  });

  it('SHOW_RESTORE_SUCCESS is ignored from restore-credentials when not loading', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'restore-credentials', isLoading: false };
    const next = authFlowReducer(state, { type: 'SHOW_RESTORE_SUCCESS' });
    expect(next.isRestoreSuccessVisible).toBe(false);
  });

  it('SHOW_RESTORE_SUCCESS is ignored from unrelated phase', () => {
    const next = authFlowReducer(createInitialState(), { type: 'SHOW_RESTORE_SUCCESS' });
    expect(next.isRestoreSuccessVisible).toBe(false);
  });

  it('HIDE_RESTORE_SUCCESS sets isRestoreSuccessVisible to false', () => {
    const state: AuthFlowState = { ...createInitialState(), isRestoreSuccessVisible: true };
    const next = authFlowReducer(state, { type: 'HIDE_RESTORE_SUCCESS' });
    expect(next.isRestoreSuccessVisible).toBe(false);
  });

  it('SHOW_IDENTITY_KEY_NOT_FOUND sets flag from restore-credentials phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'restore-credentials' };
    const next = authFlowReducer(state, { type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(next.isIdentityKeyNotFoundVisible).toBe(true);
  });

  it('SHOW_IDENTITY_KEY_NOT_FOUND sets flag from set-new-password phase', () => {
    const state: AuthFlowState = { ...createInitialState(), phase: 'set-new-password' };
    const next = authFlowReducer(state, { type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(next.isIdentityKeyNotFoundVisible).toBe(true);
  });

  it('SHOW_IDENTITY_KEY_NOT_FOUND is ignored from unrelated phase', () => {
    const next = authFlowReducer(createInitialState(), { type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(next.isIdentityKeyNotFoundVisible).toBe(false);
  });

  it('HIDE_IDENTITY_KEY_NOT_FOUND sets isIdentityKeyNotFoundVisible to false', () => {
    const state: AuthFlowState = { ...createInitialState(), isIdentityKeyNotFoundVisible: true };
    const next = authFlowReducer(state, { type: 'HIDE_IDENTITY_KEY_NOT_FOUND' });
    expect(next.isIdentityKeyNotFoundVisible).toBe(false);
  });
});
