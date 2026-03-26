import {
  x25519,
  edwardsToMontgomeryPub,
  edwardsToMontgomeryPriv,
} from '@noble/curves/ed25519';

interface PulseSharedSecretOptions {
  theirPublicKey: Uint8Array;
  myPrivateKey: Uint8Array;
}

export function pulseSharedSecret(options: PulseSharedSecretOptions): Uint8Array {
  const theirX25519Public = edwardsToMontgomeryPub(options.theirPublicKey);
  const myX25519Private = edwardsToMontgomeryPriv(options.myPrivateKey);
  return x25519.getSharedSecret(myX25519Private, theirX25519Public);
}
