import stringify from 'json-stable-stringify';

export function buildSortedJson(obj: Record<string, unknown>): string {
  const result = stringify(obj);
  if (result === undefined) throw new Error('Failed to serialize object to JSON');
  return result;
}
