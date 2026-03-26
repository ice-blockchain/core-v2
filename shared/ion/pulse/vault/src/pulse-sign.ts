import { ed25519 } from '@noble/curves/ed25519';

interface PulseVerifyOptions {
  data: Uint8Array;
  signature: Uint8Array;
  publicKey: Uint8Array;
}

export function pulseSign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(data, privateKey);
}

export function pulseVerify(options: PulseVerifyOptions): boolean {
  try {
    return ed25519.verify(options.signature, options.data, options.publicKey);
  } catch {
    return false;
  }
}
