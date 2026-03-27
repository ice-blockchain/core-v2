import type { RegistrationDataSource } from '../data-sources/registration-data-source';
import type { TokenManager } from '../token/token-manager';
import { isPasskeyAvailable, createPasskeyCredential } from '../platform/passkey';
import { IdentityError, IdentityErrorCode } from '../errors';
import { requireTemporaryToken } from './require-temporary-token';

interface RegisterWithPasskeyDeps {
  registrationDataSource: RegistrationDataSource;
  tokenManager: TokenManager;
}

export async function registerWithPasskey(
  username: string,
  deps: RegisterWithPasskeyDeps,
  earlyAccessEmail?: string,
): Promise<void> {
  if (!isPasskeyAvailable()) {
    throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Passkeys are not supported');
  }
  const challenge = await deps.registrationDataSource.initRegistration(username, earlyAccessEmail);
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
    earlyAccessEmail,
  );
  await deps.tokenManager.setTokens(username, result.authentication);
}
