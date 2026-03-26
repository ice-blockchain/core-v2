export interface PulseKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface PulseSignature {
  signature: Uint8Array;
  publicKey: Uint8Array;
}

export interface PulseEncrypted {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export interface PulsePasswordOptions {
  iterations?: number;
  memorySize?: number;
  saltLength?: number;
}
