import type { EncryptedPrivateKey } from '../crypto/encrypt-private-key';
import { decryptPrivateKey } from '../crypto/encrypt-private-key';
import { signForLogin } from '../crypto/sign-for-login';
import { signForRegistration } from '../crypto/sign-for-registration';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { createPasskeyCredential } from '../platform/passkey';
import type { RecoveryDataSource } from '../data-sources/recovery-data-source';
import type { UserRegistrationChallenge, AllowedRecoveryCredential } from '../types';
import { IdentityError, IdentityErrorCode } from '../errors';

interface RecoverAccountDeps {
  recoveryDataSource: RecoveryDataSource;
  origin: string;
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
  const recoverySign = await signWithRecoveryKey({
    credential: recoveryCredential, recoveryCode: input.recoveryCode, challenge, origin: deps.origin,
  });
  const newCredential = await buildNewCredential(input, challenge, deps.origin);
  await completeRecovery(deps, newCredential, recoverySign, challenge);
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
  challenge: UserRegistrationChallenge;
  origin: string;
}

async function signWithRecoveryKey(input: RecoverySignInput) {
  const encrypted = JSON.parse(input.credential.encryptedRecoveryKey) as EncryptedPrivateKey;
  const privateKeyPem = await decryptPrivateKey(encrypted, input.recoveryCode);
  return signForLogin({
    challenge: input.challenge.challenge,
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

async function buildNewCredential(
  input: RecoverAccountInput,
  challenge: UserRegistrationChallenge,
  origin: string,
) {
  if (input.newCredentialKind === 'Fido2') {
    return buildPasskeyCredential(challenge);
  }
  return buildPasswordCredential(
    input as PasswordRecoveryInput,
    challenge,
    origin,
  );
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

async function buildPasswordCredential(
  input: PasswordRecoveryInput,
  challenge: UserRegistrationChallenge,
  origin: string,
) {
  const keyPair = generateKeyPair();
  const regResult = await signForRegistration({
    challenge: challenge.challenge,
    origin,
    keyPair,
    password: input.newPassword,
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
}

// eslint-disable-next-line max-params
function completeRecovery(
  deps: RecoverAccountDeps,
  newCredential: Awaited<ReturnType<typeof buildNewCredential>>,
  recoverySign: { credId: string; clientData: string; signature: string },
  challenge: UserRegistrationChallenge,
) {
  return deps.recoveryDataSource.completeRecovery(
    {
      newCredentials: { firstFactorCredential: newCredential },
      recovery: buildRecoveryPayload(recoverySign),
    },
    challenge.temporaryAuthenticationToken!,
  );
}
