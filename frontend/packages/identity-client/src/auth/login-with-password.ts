import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import type { EncryptedPrivateKey } from '../crypto/encrypt-private-key';
import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import { signForLogin } from '../crypto/sign-for-login';
import { IdentityError, IdentityErrorCode } from '../errors';

interface LoginWithPasswordDeps {
  loginDataSource: LoginDataSource;
  tokenManager: TokenManager;
  origin: string;
}

interface PasswordCredentialSource {
  allowCredentials: {
    passwordProtectedKey: Array<{ id: string; encryptedPrivateKey?: string }> | null;
  };
}

function extractPasswordCredential(challenge: PasswordCredentialSource) {
  const creds = challenge.allowCredentials.passwordProtectedKey;
  if (!creds?.length) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'No password credentials available');
  }
  return creds[0]!;
}

function buildPasswordAssertion(signed: ReturnType<typeof signForLogin>, challengeIdentifier: string) {
  return {
    challengeIdentifier,
    firstFactor: {
      kind: 'PasswordProtectedKey' as const,
      credentialAssertion: {
        credId: signed.credId,
        clientData: signed.clientData,
        signature: signed.signature,
      },
    },
  };
}

async function decryptCredentialKey(rawJson: string, password: string): Promise<string> {
  let encryptedKey: EncryptedPrivateKey;
  try {
    encryptedKey = JSON.parse(rawJson) as EncryptedPrivateKey;
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted private key', error);
  }
  try {
    return await decryptPrivateKey(encryptedKey, password);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Incorrect password', error);
  }
}

interface PasswordLoginInput {
  username: string;
  password: string;
  twoFAVerificationCodes?: Record<string, string> | undefined;
}

export async function loginWithPassword(
  input: PasswordLoginInput,
  deps: LoginWithPasswordDeps,
): Promise<string> {
  const challenge = await deps.loginDataSource.initLogin(input.username, input.twoFAVerificationCodes);
  const cred = extractPasswordCredential(challenge);
  if (!cred.encryptedPrivateKey) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Credential missing encrypted private key');
  }
  const privateKeyPem = await decryptCredentialKey(cred.encryptedPrivateKey, input.password);
  const signed = signForLogin({
    challenge: challenge.challenge,
    origin: deps.origin,
    privateKeyPem,
    credentialId: cred.id,
  });
  const payload = buildPasswordAssertion(signed, challenge.challengeIdentifier);
  const tokens = await deps.loginDataSource.completeLogin(payload);
  await deps.tokenManager.setTokens(input.username, tokens);
  return input.username;
}
