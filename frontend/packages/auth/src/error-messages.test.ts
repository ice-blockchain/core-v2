import { describe, it, expect } from 'vitest';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { mapIdentityError } from './error-messages';

describe('mapIdentityError', () => {
  it('maps USER_NOT_FOUND to account not found message', () => {
    const error = new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'not found');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.USER_NOT_FOUND);
    expect(result.userMessage).toBe('Account not found. Check your identity key name.');
  });

  it('maps USER_ALREADY_EXISTS to identity key taken message', () => {
    const error = new IdentityError(IdentityErrorCode.USER_ALREADY_EXISTS, 'exists');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.USER_ALREADY_EXISTS);
    expect(result.userMessage).toBe('This identity key is already taken.');
  });

  it('maps INVALID_CREDENTIALS to incorrect password message', () => {
    const error = new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'bad creds');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.INVALID_CREDENTIALS);
    expect(result.userMessage).toBe('Incorrect password. Try again.');
  });

  it('maps PASSKEY_CANCELLED to cancelled message', () => {
    const error = new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.PASSKEY_CANCELLED);
    expect(result.userMessage).toBe('Passkey verification was cancelled.');
  });

  it('maps PASSKEY_NOT_AVAILABLE to not available message', () => {
    const error = new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'unavailable');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.PASSKEY_NOT_AVAILABLE);
    expect(result.userMessage).toBe('Passkey is not available on this device.');
  });

  it('maps PASSKEY_VALIDATION_FAILED to validation failed message', () => {
    const error = new IdentityError(IdentityErrorCode.PASSKEY_VALIDATION_FAILED, 'failed');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.PASSKEY_VALIDATION_FAILED);
    expect(result.userMessage).toBe('Passkey validation failed. Try again.');
  });

  it('maps NETWORK_ERROR to connection failed message', () => {
    const error = new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'network');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.NETWORK_ERROR);
    expect(result.userMessage).toBe('Connection failed. Check your internet and try again.');
  });

  it('maps USER_DEACTIVATED to deactivated message', () => {
    const error = new IdentityError(IdentityErrorCode.USER_DEACTIVATED, 'deactivated');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.USER_DEACTIVATED);
    expect(result.userMessage).toBe('This account has been deactivated.');
  });

  it('maps TOKEN_EXPIRED to session expired message', () => {
    const error = new IdentityError(IdentityErrorCode.TOKEN_EXPIRED, 'expired');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.TOKEN_EXPIRED);
    expect(result.userMessage).toBe('Session expired. Please sign in again.');
  });

  it('maps UNAUTHENTICATED to auth required message', () => {
    const error = new IdentityError(IdentityErrorCode.UNAUTHENTICATED, 'unauth');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.UNAUTHENTICATED);
    expect(result.userMessage).toBe('Authentication required. Please sign in.');
  });

  it('maps UNKNOWN identity error to generic message', () => {
    const error = new IdentityError(IdentityErrorCode.UNKNOWN, 'unknown');
    const result = mapIdentityError(error);
    expect(result.code).toBe(IdentityErrorCode.UNKNOWN);
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
  });

  it('maps plain Error to UNKNOWN with generic message', () => {
    const result = mapIdentityError(new Error('something broke'));
    expect(result.code).toBe('UNKNOWN');
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
  });

  it('maps string input to UNKNOWN with generic message', () => {
    const result = mapIdentityError('unexpected string');
    expect(result.code).toBe('UNKNOWN');
    expect(result.userMessage).toBe('Something went wrong. Please try again.');
  });
});
