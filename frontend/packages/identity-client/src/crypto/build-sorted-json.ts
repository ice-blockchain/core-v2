import stringify from 'json-stable-stringify';
import { IdentityError, IdentityErrorCode } from '../errors';

export function buildSortedJson(obj: Record<string, unknown>): string {
  const result = stringify(obj);
  if (result === undefined) throw new IdentityError(IdentityErrorCode.UNKNOWN, 'Failed to serialize object to JSON');
  return result;
}
