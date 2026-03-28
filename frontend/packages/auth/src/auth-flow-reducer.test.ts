import { describe, it, expect } from 'vitest';
import { IdentityErrorCode } from '@ion/identity-client';
import { authFlowReducer, createInitialState } from './auth-flow-reducer';
import type { AuthFlowState, AuthFlowError } from './types';

const TEST_ERROR: AuthFlowError = { code: IdentityErrorCode.NETWORK_ERROR, userMessage: 'Connection failed.' };

describe('createInitialState', () => {
  it('returns get-started phase with no loading or error', () => {
    const state = createInitialState();
    expect(state).toEqual({ phase: 'get-started', identityKeyName: '', isLoading: false, error: null });
  });
});

describe('authFlowReducer', () => {
  it('GO_TO_GET_STARTED resets to initial phase and clears error', () => {
    const state: AuthFlowState = {
      phase: 'register', identityKeyName: 'alice', isLoading: false, error: TEST_ERROR,
    };
    const next = authFlowReducer(state, { type: 'GO_TO_GET_STARTED' });
    expect(next.phase).toBe('get-started');
    expect(next.identityKeyName).toBe('');
    expect(next.error).toBeNull();
  });

  it('GO_TO_REGISTER transitions to register and clears error', () => {
    const state: AuthFlowState = { ...createInitialState(), error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'GO_TO_REGISTER' });
    expect(next.phase).toBe('register');
    expect(next.error).toBeNull();
  });

  it('GO_TO_VERIFY_PASSKEY sets phase and identityKeyName, clears error', () => {
    const state: AuthFlowState = { ...createInitialState(), error: TEST_ERROR };
    const next = authFlowReducer(state, { type: 'GO_TO_VERIFY_PASSKEY', identityKeyName: 'bob' });
    expect(next.phase).toBe('verify-passkey');
    expect(next.identityKeyName).toBe('bob');
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
});
