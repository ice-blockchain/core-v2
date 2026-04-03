import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import type { Pbkdf2Fn } from '../crypto/encrypt-private-key';
import { isValidEncryptedPrivateKey } from '../crypto/validate-encrypted-private-key';
import { signForLogin } from '../crypto/sign-for-login';
import { getPasskeyAssertion } from '../platform/passkey';
import { IdentityError, IdentityErrorCode } from '../errors';

interface SignUserActionDeps {
  userActionDataSource: UserActionDataSource;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
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
  const assertion = await buildAssertion({ challenge, signingContext: input.signingContext, origin: deps.origin, ...(deps.pbkdf2Fn && { pbkdf2Fn: deps.pbkdf2Fn }) });
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

interface BuildAssertionInput {
  challenge: Awaited<ReturnType<UserActionDataSource['initAction']>>;
  signingContext: SigningContext;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

async function buildAssertion(input: BuildAssertionInput) {
  if (input.signingContext.kind === 'passkey') {
    return buildPasskeyAssertion(input.challenge);
  }
  return buildPasswordAssertion({ challenge: input.challenge, password: input.signingContext.password, origin: input.origin, ...(input.pbkdf2Fn && { pbkdf2Fn: input.pbkdf2Fn }) });
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

interface BuildPasswordAssertionInput {
  challenge: Awaited<ReturnType<UserActionDataSource['initAction']>>;
  password: string;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

async function buildPasswordAssertion(input: BuildPasswordAssertionInput) {
  const cred = extractPasswordCredential(input.challenge);
  const privateKeyPem = await decryptCredential(cred.encryptedPrivateKey!, input.password, input.pbkdf2Fn);
  const signed = signForLogin({ challenge: input.challenge.challenge, origin: input.origin, privateKeyPem, credentialId: cred.id });
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

async function decryptCredential(rawJson: string, password: string, pbkdf2Fn?: Pbkdf2Fn): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted key', error);
  }
  if (!isValidEncryptedPrivateKey(parsed)) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Malformed encrypted key');
  }
  try {
    return await decryptPrivateKey(parsed, password, pbkdf2Fn);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Failed to decrypt key', error);
  }
}
