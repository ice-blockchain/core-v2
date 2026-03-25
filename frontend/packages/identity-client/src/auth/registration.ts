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

export async function registerWithPasskey(
  username: string,
  deps: RegistrationDeps,
): Promise<void> {
  if (!isPasskeyAvailable()) {
    throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Passkeys are not supported');
  }
  const challenge = await deps.registrationDataSource.initRegistration(username);
  const passkey = await createPasskeyCredential(challenge);
  const result = await deps.registrationDataSource.completeRegistration(
    {
      firstFactorCredential: {
        credentialKind: 'Fido2',
        credentialInfo: {
          credId: passkey.credentialId,
          clientDataJSON: passkey.clientDataJSON,
          attestationObject: passkey.attestationObject,
        },
      },
    },
    challenge.temporaryAuthenticationToken!,
  );
  await deps.tokenManager.setTokens(username, result.authentication);
}

export async function registerWithPassword(
  username: string,
  password: string,
  deps: RegistrationDeps,
): Promise<void> {
  const challenge = await deps.registrationDataSource.initRegistration(username);
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
    challenge.temporaryAuthenticationToken!,
  );
  await deps.tokenManager.setTokens(username, result.authentication);
}
