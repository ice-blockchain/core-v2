import { ed25519 } from '@noble/curves/ed25519';
import { utf8ToBytes } from '@noble/hashes/utils';
import { base64urlnopad } from '@scure/base';
import { parseSeedFromPem } from './generate-key-pair';
import { buildSortedJson } from './build-sorted-json';
import { validateChallengeFormat } from './validate-challenge';

export interface LoginSignatureResult {
  credId: string;
  clientData: string;
  signature: string;
}

interface SignForLoginInput {
  challenge: string;
  origin: string;
  privateKeyPem: string;
  credentialId: string;
}

export function signForLogin(input: SignForLoginInput): LoginSignatureResult {
  const { challenge, origin, privateKeyPem, credentialId } = input;
  validateChallengeFormat(challenge);
  const seed = parseSeedFromPem(privateKeyPem);
  try {
    const clientData = buildSortedJson({
      challenge, crossOrigin: false, origin, type: 'key.get',
    });
    const signature = base64urlnopad.encode(ed25519.sign(utf8ToBytes(clientData), seed));
    return {
      credId: credentialId,
      clientData: base64urlnopad.encode(utf8ToBytes(clientData)),
      signature,
    };
  } finally {
    seed.fill(0);
  }
}
