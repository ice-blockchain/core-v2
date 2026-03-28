import { base64urlnopad } from '@scure/base';
import type {
  UserRegistrationChallenge,
  UserActionChallenge,
  PasskeyRegistrationResult,
  PasskeyAuthResult,
} from '../types';
import { IdentityError, IdentityErrorCode } from '../errors';
import { validateChallengeFormat } from '../crypto/validate-challenge';

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  return base64urlnopad.decode(base64url).buffer as ArrayBuffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return base64urlnopad.encode(new Uint8Array(buffer));
}

export function isPasskeyAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

function stringToBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

function safeBase64UrlToBuffer(value: string): ArrayBuffer {
  try {
    return base64UrlToBuffer(value);
  } catch {
    return stringToBuffer(value);
  }
}

function buildCreationOptions(challenge: UserRegistrationChallenge): PublicKeyCredentialCreationOptions {
  // WebAuthn requires rp.id to match the page origin.
  // On localhost, override the server-provided rp.id for local testing.
  const rp = globalThis.location?.hostname === 'localhost'
    ? { ...challenge.rp, id: 'localhost' }
    : challenge.rp;
  return {
    rp,
    user: {
      id: safeBase64UrlToBuffer(challenge.user.id),
      name: challenge.user.name,
      displayName: challenge.user.displayName,
    },
    challenge: safeBase64UrlToBuffer(challenge.challenge),
    pubKeyCredParams: challenge.pubKeyCredParams.map((p) => ({
      type: 'public-key' as const,
      alg: p.alg,
    })),
    excludeCredentials: challenge.excludeCredentials.map((c) => ({
      type: 'public-key' as const,
      id: safeBase64UrlToBuffer(c.id),
    })),
    ...(challenge.authenticatorSelection != null && {
      authenticatorSelection: challenge.authenticatorSelection as AuthenticatorSelectionCriteria,
    }),
    attestation: challenge.attestation as AttestationConveyancePreference,
  };
}

export async function createPasskeyCredential(
  challenge: UserRegistrationChallenge,
): Promise<PasskeyRegistrationResult> {
  validateChallengeFormat(challenge.challenge);
  try {
    const credential = (await navigator.credentials.create({
      publicKey: buildCreationOptions(challenge),
    })) as PublicKeyCredential | null;
    if (!credential) {
      throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Credential creation returned null');
    }
    const response = credential.response as AuthenticatorAttestationResponse;
    return {
      credentialId: bufferToBase64Url(credential.rawId),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
    };
  } catch (error) {
    if (error instanceof IdentityError) throw error;
    throw mapPasskeyError(error);
  }
}

function buildRequestOptions(challenge: UserActionChallenge): PublicKeyCredentialRequestOptions {
  const webauthn = challenge.allowCredentials.webauthn;
  const rpId = globalThis.location?.hostname === 'localhost'
    ? 'localhost'
    : challenge.rp.id;
  const options: PublicKeyCredentialRequestOptions = {
    challenge: safeBase64UrlToBuffer(challenge.challenge),
    rpId,
    userVerification: challenge.userVerification as UserVerificationRequirement,
  };
  if (webauthn) {
    options.allowCredentials = webauthn.map((c) => ({
      type: 'public-key' as const,
      id: safeBase64UrlToBuffer(c.id),
    }));
  }
  return options;
}

export async function getPasskeyAssertion(
  challenge: UserActionChallenge,
): Promise<PasskeyAuthResult> {
  validateChallengeFormat(challenge.challenge);
  try {
    const credential = (await navigator.credentials.get({
      publicKey: buildRequestOptions(challenge),
    })) as PublicKeyCredential | null;
    if (!credential) {
      throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Credential request returned null');
    }
    const response = credential.response as AuthenticatorAssertionResponse;
    return {
      credentialId: bufferToBase64Url(credential.rawId),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    };
  } catch (error) {
    if (error instanceof IdentityError) throw error;
    throw mapPasskeyError(error);
  }
}

function mapPasskeyError(error: unknown): IdentityError {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'Passkey operation cancelled', error);
  }
  return new IdentityError(IdentityErrorCode.PASSKEY_VALIDATION_FAILED, 'Passkey operation failed', error);
}
