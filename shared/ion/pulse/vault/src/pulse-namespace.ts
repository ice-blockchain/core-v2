import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { pulseVerify } from './pulse-sign.js';

const NAMESPACE_PREFIX = '~';

interface PulseNamespaceParsed {
  publicKey: string;
  subPath: string;
}

interface PulseNamespaceWriteOptions {
  path: string;
  data: Uint8Array;
  signature: Uint8Array;
  publicKey: Uint8Array;
}

export function createPulseNamespace(publicKey: Uint8Array): string {
  return `${NAMESPACE_PREFIX}${bytesToHex(publicKey)}`;
}

export function parsePulseNamespace(path: string): PulseNamespaceParsed | null {
  if (!path.startsWith(NAMESPACE_PREFIX)) {
    return null;
  }

  const withoutPrefix = path.slice(NAMESPACE_PREFIX.length);
  const slashIndex = withoutPrefix.indexOf('/');

  if (slashIndex === -1) {
    return { publicKey: withoutPrefix, subPath: '' };
  }

  const publicKey = withoutPrefix.slice(0, slashIndex);
  const subPath = withoutPrefix.slice(slashIndex + 1);
  return { publicKey, subPath };
}

export function verifyPulseNamespaceWrite(options: PulseNamespaceWriteOptions): boolean {
  const parsed = parsePulseNamespace(options.path);
  if (!parsed) {
    return false;
  }

  const expectedPublicKeyHex = bytesToHex(options.publicKey);
  if (parsed.publicKey !== expectedPublicKeyHex) {
    return false;
  }

  return pulseVerify({
    data: options.data,
    signature: options.signature,
    publicKey: options.publicKey,
  });
}
