import { ed25519 } from '@noble/curves/ed25519';
import { base64urlnopad } from '@scure/base';
import { parseSeedFromPem } from './generate-key-pair';
import { buildSortedJson } from './build-sorted-json';

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

const encoder = new TextEncoder();

export function signForLogin(input: SignForLoginInput): LoginSignatureResult {
  const { challenge, origin, privateKeyPem, credentialId } = input;
  const seed = parseSeedFromPem(privateKeyPem);

  const clientData = buildSortedJson({
    challenge, crossOrigin: false, origin, type: 'key.get',
  });
  const signature = base64urlnopad.encode(ed25519.sign(encoder.encode(clientData), seed));

  return {
    credId: credentialId,
    clientData: base64urlnopad.encode(encoder.encode(clientData)),
    signature,
  };
}
