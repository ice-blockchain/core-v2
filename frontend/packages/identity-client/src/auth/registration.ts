import type { RegistrationDataSource } from '../data-sources/registration-data-source';
import type { TokenManager } from '../token/token-manager';
import { generateKeyPair, signForRegistration } from '../crypto';
import { isPasskeyAvailable, createPasskeyCredential } from '../passkey';
import { IdentityError, IdentityErrorCode } from '../errors';

interface RegistrationDeps {
  registrationDataSource: RegistrationDataSource;
  tokenManager: TokenManager;
  origin: string;
}

function requireTemporaryToken(token: string | null): string {
  if (!token) {
    throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Registration challenge missing temporary token');
  }
  return token;
}

export async function registerWithPasskey(
  username: string,
  deps: RegistrationDeps,
): Promise<void> {
  if (!isPasskeyAvailable()) {
    throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Passkeys are not supported');
  }
  const challenge = await deps.registrationDataSource.initRegistration(username);
  const tempToken = requireTemporaryToken(challenge.temporaryAuthenticationToken);
  const passkey = await createPasskeyCredential(challenge);
  const result = await deps.registrationDataSource.completeRegistration(
    {
      firstFactorCredential: {
        credentialKind: 'Fido2',
        credentialInfo: {
          credId: passkey.credentialId,
          clientData: passkey.clientDataJSON,
          attestationData: passkey.attestationObject,
        },
      },
    },
    tempToken,
  );
  await deps.tokenManager.setTokens(username, result.authentication);
}

export async function registerWithPassword(
  username: string,
  password: string,
  deps: RegistrationDeps,
): Promise<void> {
  const challenge = await deps.registrationDataSource.initRegistration(username);
  const tempToken = requireTemporaryToken(challenge.temporaryAuthenticationToken);
  const keyPair = generateKeyPair();
  const signed = await signForRegistration({
    challenge: challenge.challenge,
    origin: deps.origin,
    keyPair,
    password,
  });
  const result = await deps.registrationDataSource.completeRegistration(
    {
      firstFactorCredential: {
        credentialKind: 'PasswordProtectedKey',
        credentialInfo: {
          credId: signed.credId,
          clientData: signed.clientData,
          attestationData: signed.attestationData,
        },
        encryptedPrivateKey: signed.encryptedPrivateKey,
      },
    },
    tempToken,
  );
  await deps.tokenManager.setTokens(username, result.authentication);
}
