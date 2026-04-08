import { resolve, sep } from 'node:path';
import type { GreenfieldEventPayload } from './types.js';

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,62}$/;
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;
const MAX_OBJECT_NAME_LENGTH = 1024;

export function assertSafePath(
  baseDir: string,
  unsafePath: string,
): string {
  const resolvedBase = resolve(baseDir);
  const resolvedFull = resolve(baseDir, unsafePath);

  if (!resolvedFull.startsWith(resolvedBase + sep)
    && resolvedFull !== resolvedBase) {
    throw new Error(`Path traversal detected: ${unsafePath}`);
  }

  return resolvedFull;
}

export function assertSafeCdnPath(cdnPath: string): void {
  if (cdnPath.includes('..') || cdnPath.startsWith('/') || cdnPath.includes('\\')) {
    throw new Error(`Invalid CDN path: ${cdnPath}`);
  }
}

export function assertValidBucketName(bucketName: string): void {
  if (!BUCKET_NAME_PATTERN.test(bucketName)) {
    throw new Error(`Invalid bucket name: ${bucketName}`);
  }
}

export function assertSafeObjectName(objectName: string): void {
  if (objectName.length > MAX_OBJECT_NAME_LENGTH) {
    throw new Error(`Object name too long: ${objectName.length} exceeds ${MAX_OBJECT_NAME_LENGTH}`);
  }
  if (CONTROL_CHAR_PATTERN.test(objectName)) {
    throw new Error('Object name contains control characters');
  }
}

export default function validateEventPayload(
  data: unknown,
): GreenfieldEventPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Event payload must be a non-null object');
  }

  const record = data as Record<string, unknown>;

  assertNonEmptyString(record, 'bucket_name');
  assertNonEmptyString(record, 'object_name');
  assertSafeObjectName(record.object_name as string);
  assertNonEmptyString(record, 'tx_hash');
  assertPositiveNumber(record, 'payload_size');
  assertPositiveNumber(record, 'block_height');
  assertNonNegativeNumber(record, 'version');
  assertValidBucketName(record.bucket_name as string);

  record.checksums = normalizeChecksums(record.checksums);

  return data as GreenfieldEventPayload;
}

function normalizeChecksums(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Event payload field "checksums" must be an array or null');
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      throw new Error(
        `Event payload field "checksums[${i}]" must be a string, got ${typeof value[i]}`,
      );
    }
  }
  return value as string[];
}

function assertNonEmptyString(
  record: Record<string, unknown>,
  field: string,
): void {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Event payload field "${field}" must be a non-empty string`);
  }
}

function assertPositiveNumber(
  record: Record<string, unknown>,
  field: string,
): void {
  const value = record[field];
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`Event payload field "${field}" must be a positive number`);
  }
}

function assertNonNegativeNumber(
  record: Record<string, unknown>,
  field: string,
): void {
  const value = record[field];
  if (typeof value !== 'number' || value < 0) {
    throw new Error(`Event payload field "${field}" must be a non-negative number`);
  }
}
