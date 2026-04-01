import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { base64urlnopad } from '@scure/base';
import type { KeyPair } from './generate-key-pair';
import { encryptPrivateKey } from './encrypt-private-key';
import { generateCredentialId } from './generate-credential-id';
import { buildSortedJson } from './build-sorted-json';
import { validateChallengeFormat } from './validate-challenge';

export interface RegistrationSignatureResult {
  credId: string;
  clientData: string;
  attestationData: string;
  encryptedPrivateKey: string;
}

interface SignForRegistrationInput {
  challenge: string;
  origin: string;
  keyPair: KeyPair;
  password: string;
}

function buildAttestationData(clientData: string, keyPair: KeyPair): string {
  const clientDataHash = bytesToHex(sha256(utf8ToBytes(clientData)));
  const fingerprint = buildSortedJson({ clientDataHash, publicKey: keyPair.publicKeyPem });
  const signatureHex = bytesToHex(ed25519.sign(utf8ToBytes(fingerprint), keyPair.seed));
  return buildSortedJson({ publicKey: keyPair.publicKeyPem, signature: signatureHex });
}

export async function signForRegistration(
  input: SignForRegistrationInput,
): Promise<RegistrationSignatureResult> {
  const { challenge, origin, keyPair, password } = input;
  validateChallengeFormat(challenge);
  try {
    const clientData = buildSortedJson({
      challenge, crossOrigin: false, origin, type: 'key.create',
    });
    const attestationData = buildAttestationData(clientData, keyPair);
    const credId = generateCredentialId(keyPair.publicKey);
    const encrypted = await encryptPrivateKey(keyPair.privateKeyPem, password);
    return {
      credId,
      clientData: base64urlnopad.encode(utf8ToBytes(clientData)),
      attestationData: base64urlnopad.encode(utf8ToBytes(attestationData)),
      encryptedPrivateKey: JSON.stringify(encrypted),
    };
  } finally {
    keyPair.seed.fill(0);
  }
}
