import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import type { Pbkdf2Fn } from '../crypto/encrypt-private-key';
import { isValidEncryptedPrivateKey } from '../crypto/validate-encrypted-private-key';
import { signForLogin } from '../crypto/sign-for-login';
import { signForRegistration } from '../crypto/sign-for-registration';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { createPasskeyCredential } from '../platform/passkey';
import type { RecoveryDataSource } from '../data-sources/recovery-data-source';
import type { UserRegistrationChallenge, AllowedRecoveryCredential } from '../types';
import { IdentityError, IdentityErrorCode } from '../errors';
import { requireTemporaryToken } from './require-temporary-token';
import { base64urlnopad } from '@scure/base';
import { utf8ToBytes } from '@noble/hashes/utils';

interface RecoverAccountDeps {
  recoveryDataSource: RecoveryDataSource;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

interface PasswordRecoveryInput {
  username: string;
  recoveryCode: string;
  credentialId: string;
  newCredentialKind: 'PasswordProtectedKey';
  newPassword: string;
  twoFAVerificationCodes?: Record<string, string>;
}

interface PasskeyRecoveryInput {
  username: string;
  recoveryCode: string;
  credentialId: string;
  newCredentialKind: 'Fido2';
  twoFAVerificationCodes?: Record<string, string>;
}

type RecoverAccountInput = PasswordRecoveryInput | PasskeyRecoveryInput;

export async function recoverAccount(
  input: RecoverAccountInput,
  deps: RecoverAccountDeps,
): Promise<void> {
  const challenge = await initRecoveryChallenge(input, deps);
  const recoveryCredential = findRecoveryCredential(challenge, input.credentialId);
  const newCredential = await buildNewCredential({ input, challenge, origin: deps.origin, ...(deps.pbkdf2Fn && { pbkdf2Fn: deps.pbkdf2Fn }) });
  const newCredentialsPayload = { firstFactorCredential: newCredential };
  const recoverySign = await signWithRecoveryKey({
    credential: recoveryCredential,
    recoveryCode: input.recoveryCode,
    newCredentialsPayload,
    origin: deps.origin,
    ...(deps.pbkdf2Fn && { pbkdf2Fn: deps.pbkdf2Fn }),
  });
  const temporaryToken = requireTemporaryToken(challenge.temporaryAuthenticationToken);
  await completeRecovery({ deps, newCredential, recoverySign, temporaryToken });
}

function initRecoveryChallenge(
  input: RecoverAccountInput,
  deps: RecoverAccountDeps,
) {
  return deps.recoveryDataSource.initRecovery({
    username: input.username,
    credentialId: input.credentialId,
    '2FAVerificationCodes': input.twoFAVerificationCodes,
  });
}

function findRecoveryCredential(
  challenge: UserRegistrationChallenge,
  credentialId: string,
): AllowedRecoveryCredential {
  const cred = challenge.allowedRecoveryCredentials?.find(
    (c) => c.id === credentialId,
  );
  if (!cred) {
    throw new IdentityError(
      IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS,
      'Recovery credential not found',
    );
  }
  return cred;
}

interface RecoverySignInput {
  credential: AllowedRecoveryCredential;
  recoveryCode: string;
  newCredentialsPayload: Record<string, unknown>;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

function parseEncryptedRecoveryKey(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'Malformed encrypted recovery key', error);
  }
  if (!isValidEncryptedPrivateKey(parsed)) {
    throw new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'Malformed encrypted recovery key');
  }
  return parsed;
}

async function signWithRecoveryKey(input: RecoverySignInput) {
  const parsed = parseEncryptedRecoveryKey(input.credential.encryptedRecoveryKey);
  const privateKeyPem = await decryptPrivateKey(parsed, input.recoveryCode, input.pbkdf2Fn);
  const challenge = base64urlnopad.encode(utf8ToBytes(JSON.stringify(input.newCredentialsPayload)));
  return signForLogin({
    challenge,
    origin: input.origin,
    privateKeyPem,
    credentialId: input.credential.id,
  });
}

function buildRecoveryPayload(signed: { credId: string; clientData: string; signature: string }) {
  return {
    kind: 'RecoveryKey' as const,
    credentialAssertion: {
      clientData: signed.clientData,
      credId: signed.credId,
      signature: signed.signature,
    },
  };
}

interface BuildNewCredentialInput {
  input: RecoverAccountInput;
  challenge: UserRegistrationChallenge;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

async function buildNewCredential(params: BuildNewCredentialInput) {
  if (params.input.newCredentialKind === 'Fido2') {
    return buildPasskeyCredential(params.challenge);
  }
  return buildPasswordCredential({
    input: params.input as PasswordRecoveryInput,
    challenge: params.challenge,
    origin: params.origin,
    ...(params.pbkdf2Fn && { pbkdf2Fn: params.pbkdf2Fn }),
  });
}

async function buildPasskeyCredential(challenge: UserRegistrationChallenge) {
  const passkey = await createPasskeyCredential(challenge);
  return {
    credentialKind: 'Fido2' as const,
    credentialInfo: {
      credId: passkey.credentialId,
      clientData: passkey.clientDataJSON,
      attestationData: passkey.attestationObject,
    },
    encryptedPrivateKey: null,
  };
}

interface BuildPasswordCredentialInput {
  input: PasswordRecoveryInput;
  challenge: UserRegistrationChallenge;
  origin: string;
  pbkdf2Fn?: Pbkdf2Fn;
}

async function buildPasswordCredential(params: BuildPasswordCredentialInput) {
  const keyPair = generateKeyPair();
  try {
    const regResult = await signForRegistration({
      challenge: params.challenge.challenge,
      origin: params.origin,
      keyPair,
      password: params.input.newPassword,
      ...(params.pbkdf2Fn && { pbkdf2Fn: params.pbkdf2Fn }),
    });
    return {
      credentialKind: 'PasswordProtectedKey' as const,
      credentialInfo: {
        credId: regResult.credId,
        clientData: regResult.clientData,
        attestationData: regResult.attestationData,
      },
      encryptedPrivateKey: regResult.encryptedPrivateKey,
    };
  } finally {
    keyPair.seed.fill(0);
  }
}

interface CompleteRecoveryInput {
  deps: RecoverAccountDeps;
  newCredential: Awaited<ReturnType<typeof buildNewCredential>>;
  recoverySign: { credId: string; clientData: string; signature: string };
  temporaryToken: string;
}

function completeRecovery(input: CompleteRecoveryInput) {
  return input.deps.recoveryDataSource.completeRecovery(
    {
      newCredentials: { firstFactorCredential: input.newCredential },
      recovery: buildRecoveryPayload(input.recoverySign),
    },
    input.temporaryToken,
  );
}
