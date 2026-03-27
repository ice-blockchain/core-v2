import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes, concatBytes } from '@noble/hashes/utils';
import { base64 } from '@scure/base';
import { IdentityError, IdentityErrorCode } from '../errors';

export interface KeyPair {
  seed: Uint8Array;
  publicKey: Uint8Array;
  publicKeyPem: string;
  privateKeyPem: string;
}

// Ed25519 SubjectPublicKeyInfo prefix (OID 1.3.101.112)
const SPKI_PREFIX = new Uint8Array([
  0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
]);

// Ed25519 PKCS#8 prefix (OID 1.3.101.112)
const PKCS8_PREFIX = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);

function toPem(tag: string, der: Uint8Array): string {
  return `-----BEGIN ${tag}-----\n${base64.encode(der)}\n-----END ${tag}-----`;
}

export function parseSeedFromPem(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const decoded = base64.decode(b64);
  if (decoded.length !== 48) {
    throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Invalid Ed25519 PKCS#8 key: expected 48 bytes');
  }
  for (let i = 0; i < PKCS8_PREFIX.length; i++) {
    if (decoded[i] !== PKCS8_PREFIX[i]) {
      throw new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'Invalid Ed25519 PKCS#8 key: wrong prefix');
    }
  }
  return decoded.slice(16, 48);
}

export function generateKeyPair(): KeyPair {
  const seed = randomBytes(32);
  const publicKey = ed25519.getPublicKey(seed);
  return {
    seed,
    publicKey,
    publicKeyPem: toPem('PUBLIC KEY', concatBytes(SPKI_PREFIX, publicKey)),
    privateKeyPem: toPem('PRIVATE KEY', concatBytes(PKCS8_PREFIX, seed)),
  };
}
