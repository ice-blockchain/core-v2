import { resolve, sep } from 'node:path';
import AppError from './app-error.js';
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
    throw new AppError(`Path traversal detected: ${unsafePath}`, 400);
  }

  return resolvedFull;
}

export function assertSafeCdnPath(cdnPath: string): void {
  if (cdnPath.includes('..') || cdnPath.startsWith('/') || cdnPath.includes('\\')) {
    throw new AppError(`Invalid CDN path: ${cdnPath}`, 400);
  }
}

export function assertValidBucketName(bucketName: string): void {
  if (!BUCKET_NAME_PATTERN.test(bucketName)) {
    throw new AppError(`Invalid bucket name: ${bucketName}`, 400);
  }
}

export function assertSafeObjectName(objectName: string): void {
  if (objectName.length > MAX_OBJECT_NAME_LENGTH) {
    throw new AppError(`Object name too long: ${objectName.length} exceeds ${MAX_OBJECT_NAME_LENGTH}`, 400);
  }
  if (CONTROL_CHAR_PATTERN.test(objectName)) {
    throw new AppError('Object name contains control characters', 400);
  }
}

export default function validateEventPayload(
  data: unknown,
): GreenfieldEventPayload {
  if (!data || typeof data !== 'object') {
    throw new AppError('Event payload must be a non-null object', 400);
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
    throw new AppError('Event payload field "checksums" must be an array or null', 400);
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      throw new AppError(
        `Event payload field "checksums[${i}]" must be a string, got ${typeof value[i]}`, 400,
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
    throw new AppError(`Event payload field "${field}" must be a non-empty string`, 400);
  }
}

function assertPositiveNumber(
  record: Record<string, unknown>,
  field: string,
): void {
  const value = record[field];
  if (typeof value !== 'number' || value <= 0) {
    throw new AppError(`Event payload field "${field}" must be a positive number`, 400);
  }
}

function assertNonNegativeNumber(
  record: Record<string, unknown>,
  field: string,
): void {
  const value = record[field];
  if (typeof value !== 'number' || value < 0) {
    throw new AppError(`Event payload field "${field}" must be a non-negative number`, 400);
  }
}
