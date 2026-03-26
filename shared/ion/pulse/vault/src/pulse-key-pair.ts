import { ed25519 } from '@noble/curves/ed25519';
import type { PulseKeyPair } from './types.js';

export function generatePulseKeyPair(): PulseKeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function derivePublicKey(privateKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(privateKey);
}
