import { Passkey } from 'react-native-passkey';
import type {
  UserRegistrationChallenge,
  UserActionChallenge,
  PasskeyRegistrationResult,
  PasskeyAuthResult,
} from '../types';
import { Logger } from '@ion/diagnostics';
import { IdentityError, IdentityErrorCode } from '../errors';
import { validateChallengeFormat } from '../crypto/validate-challenge';

export function isPasskeyAvailable(): boolean {
  return Passkey.isSupported();
}

export async function createPasskeyCredential(
  challenge: UserRegistrationChallenge,
): Promise<PasskeyRegistrationResult> {
  validateChallengeFormat(challenge.challenge);
  try {
    const request: Parameters<typeof Passkey.create>[0] = {
      challenge: challenge.challenge,
      rp: challenge.rp,
      user: challenge.user,
      pubKeyCredParams: challenge.pubKeyCredParams,
      attestation: challenge.attestation,
      excludeCredentials: challenge.excludeCredentials,
    };
    if (challenge.authenticatorSelection != null) {
      request.authenticatorSelection = { ...challenge.authenticatorSelection };
    }
    const result = await Passkey.create(request);
    return {
      credentialId: result.rawId,
      clientDataJSON: result.response.clientDataJSON,
      attestationObject: result.response.attestationObject,
    };
  } catch (error) {
    throw mapNativePasskeyError(error);
  }
}

export async function getPasskeyAssertion(
  challenge: UserActionChallenge,
): Promise<PasskeyAuthResult> {
  validateChallengeFormat(challenge.challenge);
  try {
    const request: Parameters<typeof Passkey.get>[0] = {
      challenge: challenge.challenge,
      rpId: challenge.rp.id,
      userVerification: challenge.userVerification,
    };
    if (challenge.allowCredentials.webauthn != null) {
      request.allowCredentials = challenge.allowCredentials.webauthn;
    }
    const result = await Passkey.get(request);
    return {
      credentialId: result.rawId,
      clientDataJSON: result.response.clientDataJSON,
      authenticatorData: result.response.authenticatorData,
      signature: result.response.signature,
      userHandle: result.response.userHandle ?? null,
    };
  } catch (error) {
    throw mapNativePasskeyError(error);
  }
}

function isPasskeyErrorObject(error: unknown): error is { error: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'message' in error
  );
}

const CANCELLATION_ERROR_CODES = new Set(['UserCancelled', 'Interrupted']);

function mapNativePasskeyError(error: unknown): IdentityError {
  const message = isPasskeyErrorObject(error) ? error.message : String(error);
  const errorCode = isPasskeyErrorObject(error) ? error.error : '';
  Logger.warning('Passkey native error', { tag: 'identity', data: { errorCode, message } });
  if (CANCELLATION_ERROR_CODES.has(errorCode)) {
    return new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'Passkey operation cancelled', error);
  }
  return new IdentityError(IdentityErrorCode.PASSKEY_VALIDATION_FAILED, 'Passkey operation failed', error);
}
