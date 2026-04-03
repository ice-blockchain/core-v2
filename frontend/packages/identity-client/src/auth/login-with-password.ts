import { ed25519 } from '@noble/curves/ed25519';
import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import type { Pbkdf2Fn } from '../crypto/encrypt-private-key';
import { isValidEncryptedPrivateKey } from '../crypto/validate-encrypted-private-key';
import { parseSeedFromPem } from '../crypto/generate-key-pair';
import { generateCredentialId } from '../crypto/generate-credential-id';
import { signForLogin } from '../crypto/sign-for-login';
import { IdentityError, IdentityErrorCode } from '../errors';
import { parseUserIdFromToken } from '../token/parse-user-id-from-token';

interface LoginWithPasswordDeps {
  loginDataSource: LoginDataSource;
  tokenManager: TokenManager;
  authStore: InternalAuthStore;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
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

async function decryptCredentialKey(rawJson: string, password: string, pbkdf2Fn?: Pbkdf2Fn): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted private key', error);
  }
  if (!isValidEncryptedPrivateKey(parsed)) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted private key');
  }
  try {
    return await decryptPrivateKey(parsed, password, pbkdf2Fn);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Failed to decrypt private key', error);
  }
}

function verifyDecryptedKeyMatchesCredential(privateKeyPem: string, expectedCredId: string): void {
  const seed = parseSeedFromPem(privateKeyPem);
  try {
    const publicKey = ed25519.getPublicKey(seed);
    const derivedCredId = generateCredentialId(publicKey);
    if (derivedCredId !== expectedCredId) {
      throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Decrypted key does not match credential');
    }
  } finally {
    seed.fill(0);
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
  const privateKeyPem = await decryptCredentialKey(cred.encryptedPrivateKey, input.password, deps.pbkdf2Fn);
  verifyDecryptedKeyMatchesCredential(privateKeyPem, cred.id);
  const signed = signForLogin({
    challenge: challenge.challenge,
    origin: deps.origin,
    privateKeyPem,
    credentialId: cred.id,
  });
  const payload = buildPasswordAssertion(signed, challenge.challengeIdentifier);
  const tokens = await deps.loginDataSource.completeLogin(payload);
  await deps.tokenManager.setTokens(input.username, tokens);
  deps.authStore.addUser(input.username);
  return parseUserIdFromToken(tokens.token) ?? input.username;
}
