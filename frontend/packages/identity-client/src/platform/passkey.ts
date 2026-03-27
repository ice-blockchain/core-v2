import type {
  UserRegistrationChallenge,
  UserActionChallenge,
  PasskeyRegistrationResult,
  PasskeyAuthResult,
} from '../types';

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function isPasskeyAvailable(): boolean {
  throw new Error('Platform implementation not resolved');
}

export function createPasskeyCredential(
  _challenge: UserRegistrationChallenge,
): Promise<PasskeyRegistrationResult> {
  throw new Error('Platform implementation not resolved');
}

export function getPasskeyAssertion(
  _challenge: UserActionChallenge,
): Promise<PasskeyAuthResult> {
  throw new Error('Platform implementation not resolved');
}
