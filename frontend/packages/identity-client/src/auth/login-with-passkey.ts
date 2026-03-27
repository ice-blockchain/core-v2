import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import { isPasskeyAvailable, getPasskeyAssertion } from '../platform/passkey';
import { IdentityError, IdentityErrorCode } from '../errors';

interface LoginWithPasskeyDeps {
  loginDataSource: LoginDataSource;
  tokenManager: TokenManager;
}

export async function loginWithPasskey(
  username: string,
  deps: LoginWithPasskeyDeps,
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
