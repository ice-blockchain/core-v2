import { base64urlnopad } from '@scure/base';
import type {
  UserRegistrationChallenge,
  UserActionChallenge,
  PasskeyRegistrationResult,
  PasskeyAuthResult,
} from '../types';
import { IdentityError, IdentityErrorCode } from '../errors';

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  return base64urlnopad.decode(base64url).buffer as ArrayBuffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  return base64urlnopad.encode(new Uint8Array(buffer));
}

export function isPasskeyAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator.credentials?.create === 'function'
  );
}

function buildCreationOptions(challenge: UserRegistrationChallenge): PublicKeyCredentialCreationOptions {
  return {
    rp: challenge.rp,
    user: {
      id: base64UrlToBuffer(challenge.user.id),
      name: challenge.user.name,
      displayName: challenge.user.displayName,
    },
    challenge: base64UrlToBuffer(challenge.challenge),
    pubKeyCredParams: challenge.pubKeyCredParams.map((p) => ({
      type: 'public-key' as const,
      alg: p.alg,
    })),
    excludeCredentials: challenge.excludeCredentials.map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
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
  const options: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(challenge.challenge),
    rpId: challenge.rp.id,
    userVerification: challenge.userVerification as UserVerificationRequirement,
  };
  if (webauthn) {
    options.allowCredentials = webauthn.map((c) => ({
      type: 'public-key' as const,
      id: base64UrlToBuffer(c.id),
    }));
  }
  return options;
}

export async function getPasskeyAssertion(
  challenge: UserActionChallenge,
): Promise<PasskeyAuthResult> {
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
