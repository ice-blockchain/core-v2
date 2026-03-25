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
): Promise<string> {
  if (!isPasskeyAvailable()) {
    throw new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'Passkeys are not supported');
  }
  const challenge = await deps.loginDataSource.initLogin(username);
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
        userHandle: assertion.userHandle,
      },
    },
  });
  await deps.tokenManager.setTokens(username, tokens);
  return username;
}

function extractPasswordCredential(challenge: { allowCredentials: { passwordProtectedKey: Array<{ id: string; encryptedPrivateKey?: string }> | null } }) {
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

export async function loginWithPassword(
  username: string,
  password: string,
  deps: LoginDeps,
): Promise<string> {
  const challenge = await deps.loginDataSource.initLogin(username);
  const cred = extractPasswordCredential(challenge);
  if (!cred.encryptedPrivateKey) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Credential missing encrypted private key');
  }
  const privateKeyPem = await decryptPrivateKey(
    JSON.parse(cred.encryptedPrivateKey) as EncryptedPrivateKey,
    password,
  );
  const signed = signForLogin({
    challenge: challenge.challenge,
    origin: deps.origin,
    privateKeyPem,
    credentialId: cred.id,
  });
  const payload = buildPasswordAssertion(signed, challenge.challengeIdentifier);
  const tokens = await deps.loginDataSource.completeLogin(payload);
  await deps.tokenManager.setTokens(username, tokens);
  return username;
}
