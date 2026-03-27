import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { IdentityError, IdentityErrorCode } from '../errors';

export function generateCredentialId(publicKey: Uint8Array): string {
  const hash = sha256(publicKey);
  const truncated = hash.slice(0, 16);
  const num = BigInt('0x' + bytesToHex(truncated));
  const raw = num.toString(36).toUpperCase().padStart(25, '0');
  const groups = raw.match(/.{5}/g);
  if (!groups) throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Failed to split credential ID into groups');
  return groups.join('-');
}
