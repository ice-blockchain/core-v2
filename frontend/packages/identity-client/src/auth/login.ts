import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import type { EncryptedPrivateKey } from '../crypto';
import { decryptPrivateKey, signForLogin } from '../crypto';
import { isPasskeyAvailable, getPasskeyAssertion } from '../passkey';
import { IdentityError, IdentityErrorCode } from '../errors';

interface LoginDeps {
  loginDataSource: LoginDataSource;
  tokenManager: TokenManager;
  origin: string;
}

export async function loginWithPasskey(
  username: string,
  deps: LoginDeps,
  twoFAVerificationCodes?: Record<string, string>,
): Promise<string> {
  if (!isPasskeyAvailable()) {
    throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Passkeys are not supported');
  }
  const challenge = await deps.loginDataSource.initLogin(username, twoFAVerificationCodes);
  const assertion = await getPasskeyAssertion(challenge);
  const tokens = await deps.loginDataSource.completeLogin({
    challengeIdentifier: challenge.challengeIdentifier,
    firstFactor: {
      kind: 'Fido2',
      credentialAssertion: {
        credId: assertion.credentialId,
        clientData: assertion.clientDataJSON,
        authenticatorData: assertion.authenticatorData,
        signature: assertion.signature,
        ...(assertion.userHandle != null && { userHandle: assertion.userHandle }),
      },
    },
  });
  await deps.tokenManager.setTokens(username, tokens);
  return username;
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
  } catch {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted private key');
  }
  try {
    return await decryptPrivateKey(encryptedKey, password);
  } catch {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Incorrect password');
  }
}

interface PasswordLoginInput {
  username: string;
  password: string;
  twoFAVerificationCodes?: Record<string, string> | undefined;
}

export async function loginWithPassword(
  input: PasswordLoginInput,
  deps: LoginDeps,
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
