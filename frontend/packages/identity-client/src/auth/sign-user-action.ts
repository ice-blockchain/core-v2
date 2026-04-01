import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { EncryptedPrivateKey } from '../crypto/encrypt-private-key';
import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import { signForLogin } from '../crypto/sign-for-login';
import { getPasskeyAssertion } from '../platform/passkey';
import { IdentityError, IdentityErrorCode } from '../errors';

interface SignUserActionDeps {
  userActionDataSource: UserActionDataSource;
  origin: string;
}

interface PasswordSigningContext {
  kind: 'password';
  password: string;
}

interface PasskeySigningContext {
  kind: 'passkey';
}

type SigningContext = PasswordSigningContext | PasskeySigningContext;

interface SignUserActionInput {
  username: string;
  httpMethod: string;
  httpPath: string;
  body: unknown;
  signingContext: SigningContext;
}

export async function signUserAction(
  input: SignUserActionInput,
  deps: SignUserActionDeps,
): Promise<string> {
  const challenge = await initChallenge(input, deps);
  const assertion = await buildAssertion(challenge, input.signingContext, deps.origin);
  const result = await deps.userActionDataSource.completeAction(
    { challengeIdentifier: challenge.challengeIdentifier, firstFactor: assertion },
    input.username,
  );
  return result.userAction;
}

async function initChallenge(input: SignUserActionInput, deps: SignUserActionDeps) {
  return deps.userActionDataSource.initAction(
    {
      userActionPayload: JSON.stringify(input.body ?? {}),
      userActionHttpMethod: input.httpMethod,
      userActionHttpPath: input.httpPath,
      userActionServerKind: 'Api',
    },
    input.username,
  );
}

async function buildAssertion(
  challenge: Awaited<ReturnType<UserActionDataSource['initAction']>>,
  signingContext: SigningContext,
  origin: string,
) {
  if (signingContext.kind === 'passkey') {
    return buildPasskeyAssertion(challenge);
  }
  return buildPasswordAssertion(challenge, signingContext.password, origin);
}

async function buildPasskeyAssertion(challenge: Awaited<ReturnType<UserActionDataSource['initAction']>>) {
  const assertion = await getPasskeyAssertion(challenge);
  return {
    kind: 'Fido2' as const,
    credentialAssertion: {
      clientData: assertion.clientDataJSON,
      credId: assertion.credentialId,
      signature: assertion.signature,
      authenticatorData: assertion.authenticatorData,
      userHandle: assertion.userHandle,
    },
  };
}

async function buildPasswordAssertion(
  challenge: Awaited<ReturnType<UserActionDataSource['initAction']>>,
  password: string,
  origin: string,
) {
  const cred = extractPasswordCredential(challenge);
  const privateKeyPem = await decryptCredential(cred.encryptedPrivateKey!, password);
  const signed = signForLogin({ challenge: challenge.challenge, origin, privateKeyPem, credentialId: cred.id });
  return {
    kind: 'PasswordProtectedKey' as const,
    credentialAssertion: {
      clientData: signed.clientData,
      credId: signed.credId,
      signature: signed.signature,
    },
  };
}

function extractPasswordCredential(
  challenge: { allowCredentials: { passwordProtectedKey: Array<{ id: string; encryptedPrivateKey?: string }> | null } },
) {
  const creds = challenge.allowCredentials.passwordProtectedKey;
  if (!creds?.length || !creds[0]!.encryptedPrivateKey) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'No password credentials available for signing');
  }
  return creds[0]!;
}

async function decryptCredential(rawJson: string, password: string): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted key', error);
  }
  try {
    return await decryptPrivateKey(parsed as EncryptedPrivateKey, password);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Failed to decrypt key', error);
  }
}
