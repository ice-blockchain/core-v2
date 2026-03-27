import type { RegistrationDataSource } from '../data-sources/registration-data-source';
import type { TokenManager } from '../token/token-manager';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { signForRegistration } from '../crypto/sign-for-registration';
import { requireTemporaryToken } from './require-temporary-token';

interface RegisterWithPasswordDeps {
  registrationDataSource: RegistrationDataSource;
  tokenManager: TokenManager;
  origin: string;
}

interface PasswordRegistrationInput {
  username: string;
  password: string;
  earlyAccessEmail?: string | undefined;
}

export async function registerWithPassword(
  input: PasswordRegistrationInput,
  deps: RegisterWithPasswordDeps,
): Promise<void> {
  const challenge = await deps.registrationDataSource.initRegistration(input.username, input.earlyAccessEmail);
  const tempToken = requireTemporaryToken(challenge.temporaryAuthenticationToken);
  const keyPair = generateKeyPair();
  const signed = await signForRegistration({
    challenge: challenge.challenge,
    origin: deps.origin,
    keyPair,
    password: input.password,
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
    input.earlyAccessEmail,
  );
  await deps.tokenManager.setTokens(input.username, result.authentication);
}
