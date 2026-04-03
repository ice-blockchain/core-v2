import type { RegistrationDataSource } from '../data-sources/registration-data-source';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { signForRegistration } from '../crypto/sign-for-registration';
import type { Pbkdf2Fn } from '../crypto/encrypt-private-key';
import { requireTemporaryToken } from './require-temporary-token';

interface RegisterWithPasswordDeps {
  registrationDataSource: RegistrationDataSource;
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
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
  const signed = await signForRegistration({
    challenge: challenge.challenge, origin: deps.origin, keyPair: generateKeyPair(), password: input.password, ...(deps.pbkdf2Fn && { pbkdf2Fn: deps.pbkdf2Fn }),
  });
  const credential = buildPasswordCredential(signed);
  const result = await deps.registrationDataSource.completeRegistration(credential, tempToken, input.earlyAccessEmail);
  await deps.tokenManager.setTokens(input.username, result.authentication);
  deps.authStore.addUser(input.username);
}

function buildPasswordCredential(signed: { credId: string; clientData: string; attestationData: string; encryptedPrivateKey: string }) {
  return {
    firstFactorCredential: {
      credentialKind: 'PasswordProtectedKey' as const,
      credentialInfo: { credId: signed.credId, clientData: signed.clientData, attestationData: signed.attestationData },
      encryptedPrivateKey: signed.encryptedPrivateKey,
    },
  };
}
