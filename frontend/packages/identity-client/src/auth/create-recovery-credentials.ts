import { randomBytes } from '@noble/hashes/utils';
import type { CredentialsDataSource } from '../data-sources/credentials-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { signForRegistration } from '../crypto/sign-for-registration';
import { signUserAction } from './sign-user-action';

interface CreateRecoveryCredentialsDeps {
  credentialsDataSource: CredentialsDataSource;
  userActionDataSource: UserActionDataSource;
  origin: string;
}

interface RecoveryCredentialsResult {
  identityKeyName: string;
  recoveryKeyId: string;
  recoveryCode: string;
}

type SigningContext = { kind: 'password'; password: string } | { kind: 'passkey' };

export async function createRecoveryCredentials(
  username: string,
  signingContext: SigningContext,
  deps: CreateRecoveryCredentialsDeps,
): Promise<RecoveryCredentialsResult> {
  return executeCreateRecovery(username, signingContext, deps);
}

async function executeCreateRecovery(
  username: string,
  signingContext: SigningContext,
  deps: CreateRecoveryCredentialsDeps,
): Promise<RecoveryCredentialsResult> {
  const challenge = await deps.credentialsDataSource.initCreateCredential('RecoveryKey', username);
  const recoveryCode = generateRecoveryCode();
  const regResult = await buildRecoveryCredential(challenge.challenge, recoveryCode, deps.origin);
  const payload = buildPayload(challenge.challengeIdentifier, regResult);
  const userAction = await getSignedAction({ username, signingContext, body: payload }, deps);
  const result = await deps.credentialsDataSource.createCredential(payload, { username, userAction });
  return { identityKeyName: result.name, recoveryKeyId: result.credentialId, recoveryCode };
}

function buildPayload(
  challengeIdentifier: string,
  reg: Awaited<ReturnType<typeof buildRecoveryCredential>>,
) {
  return {
    challengeIdentifier,
    credentialName: reg.credId,
    credentialKind: 'RecoveryKey',
    credentialInfo: {
      credId: reg.credId,
      clientData: reg.clientData,
      attestationData: reg.attestationData,
    },
    encryptedPrivateKey: reg.encryptedPrivateKey,
  };
}

interface SignActionInput {
  username: string;
  signingContext: SigningContext;
  body: unknown;
}

async function getSignedAction(input: SignActionInput, deps: CreateRecoveryCredentialsDeps) {
  return signUserAction(
    { username: input.username, httpMethod: 'POST', httpPath: '/auth/credentials', body: input.body, signingContext: input.signingContext },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
}

async function buildRecoveryCredential(challenge: string, recoveryCode: string, origin: string) {
  const keyPair = generateKeyPair();
  return signForRegistration({ challenge, origin, keyPair, password: recoveryCode });
}

const RECOVERY_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@%!$#';

function generateRecoveryCode(): string {
  const bytes = randomBytes(32);
  return Array.from(bytes).map((b) => RECOVERY_CHARSET[b % RECOVERY_CHARSET.length]).join('');
}
