export interface PulseKeyPair {
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
}

export interface PulseEncryptedData {
  readonly ciphertext: Uint8Array;
  readonly nonce: Uint8Array;
}

export interface PulseSignature {
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
}

export interface PulseSharedSecret {
  readonly secret: Uint8Array;
}
