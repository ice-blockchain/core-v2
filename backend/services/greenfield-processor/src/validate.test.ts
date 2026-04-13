import { describe, it, expect } from 'vitest';
import validateEventPayload, {
  assertSafePath,
  assertSafeCdnPath,
  assertValidBucketName,
  assertSafeObjectName,
} from './validate.js';

describe('assertSafePath', () => {
  it('allows simple relative names', () => {
    const result = assertSafePath('/tmp/base', 'bucket/obj.bin');
    expect(result).toBe('/tmp/base/bucket/obj.bin');
  });

  it('allows nested paths within base', () => {
    const result = assertSafePath('/tmp/base', 'bucket/sub/file.txt');
    expect(result).toBe('/tmp/base/bucket/sub/file.txt');
  });

  it('rejects ../ traversal', () => {
    expect(() => assertSafePath('/tmp/base', '../etc/passwd'))
      .toThrow('Path traversal detected');
  });

  it('rejects deeply nested traversal', () => {
    expect(() => assertSafePath('/tmp/base', 'bucket/../../etc/passwd'))
      .toThrow('Path traversal detected');
  });

  it('rejects absolute paths outside base', () => {
    expect(() => assertSafePath('/tmp/base', '/etc/passwd'))
      .toThrow('Path traversal detected');
  });
});

describe('assertSafeCdnPath', () => {
  it('allows normal paths', () => {
    expect(() => assertSafeCdnPath('bucket/object.png')).not.toThrow();
  });

  it('rejects .. segments', () => {
    expect(() => assertSafeCdnPath('bucket/../etc/passwd'))
      .toThrow('Invalid CDN path');
  });

  it('rejects leading slash', () => {
    expect(() => assertSafeCdnPath('/bucket/obj'))
      .toThrow('Invalid CDN path');
  });

  it('rejects backslashes', () => {
    expect(() => assertSafeCdnPath('bucket\\obj'))
      .toThrow('Invalid CDN path');
  });
});

describe('assertValidBucketName', () => {
  it('accepts valid bucket names', () => {
    expect(() => assertValidBucketName('my-bucket-123')).not.toThrow();
    expect(() => assertValidBucketName('a.b.c')).not.toThrow();
    expect(() => assertValidBucketName('0bucket')).not.toThrow();
  });

  it('rejects names starting with hyphen', () => {
    expect(() => assertValidBucketName('-bad'))
      .toThrow('Invalid bucket name');
  });

  it('rejects uppercase characters', () => {
    expect(() => assertValidBucketName('BadBucket'))
      .toThrow('Invalid bucket name');
  });

  it('rejects names over 63 characters', () => {
    const longName = 'a'.repeat(64);
    expect(() => assertValidBucketName(longName))
      .toThrow('Invalid bucket name');
  });

  it('rejects empty string', () => {
    expect(() => assertValidBucketName(''))
      .toThrow('Invalid bucket name');
  });

  it('rejects names with special characters', () => {
    expect(() => assertValidBucketName('bucket/name'))
      .toThrow('Invalid bucket name');
  });
});

describe('assertSafeObjectName', () => {
  it('accepts valid object names', () => {
    expect(() => assertSafeObjectName('photo.png')).not.toThrow();
    expect(() => assertSafeObjectName('folder/sub-folder/file.png')).not.toThrow();
    expect(() => assertSafeObjectName('file with spaces.png')).not.toThrow();
  });

  it('rejects names with null bytes', () => {
    expect(() => assertSafeObjectName('file\0.bin'))
      .toThrow('control characters');
  });

  it('rejects names with control characters', () => {
    expect(() => assertSafeObjectName('file\x01name'))
      .toThrow('control characters');
    expect(() => assertSafeObjectName('file\x7fname'))
      .toThrow('control characters');
    expect(() => assertSafeObjectName('file\tname'))
      .toThrow('control characters');
  });

  it('rejects names exceeding 1024 characters', () => {
    const longName = 'a'.repeat(1025);
    expect(() => assertSafeObjectName(longName))
      .toThrow('too long');
  });

  it('accepts names at exactly 1024 characters', () => {
    const maxName = 'a'.repeat(1024);
    expect(() => assertSafeObjectName(maxName)).not.toThrow();
  });
});

describe('validateEventPayload', () => {
  const validCreatePayload = {
    block_height: 100,
    tx_hash: '0xabc123',
    bucket_name: 'my-bucket',
    content_type: 'image/png',
    create_at: 1000,
    creator: '0xuser',
    object_name: 'photo.png',
    payload_size: 5000,
    checksums: ['abc'],
    version: 1,
  };

  const validUpdatePayload = {
    block_height: 200,
    tx_hash: '0xdef456',
    operator: '0xop',
    bucket_name: 'my-bucket',
    object_name: 'photo.png',
    payload_size: 6000,
    checksums: ['def'],
    version: 2,
  };

  it('accepts valid CreateObjectEventPayload', () => {
    const result = validateEventPayload(validCreatePayload);
    expect(result).toEqual(validCreatePayload);
  });

  it('accepts valid UpdateObjectContentPayload', () => {
    const result = validateEventPayload(validUpdatePayload);
    expect(result).toEqual(validUpdatePayload);
  });

  it('rejects null input', () => {
    expect(() => validateEventPayload(null))
      .toThrow('must be a non-null object');
  });

  it('rejects missing bucket_name', () => {
    const { bucket_name: _, ...without } = validCreatePayload;
    expect(() => validateEventPayload(without))
      .toThrow('"bucket_name" must be a non-empty string');
  });

  it('rejects empty object_name', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, object_name: '' }))
      .toThrow('"object_name" must be a non-empty string');
  });

  it('rejects negative payload_size', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, payload_size: -1 }))
      .toThrow('"payload_size" must be a positive number');
  });

  it('rejects zero payload_size', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, payload_size: 0 }))
      .toThrow('"payload_size" must be a positive number');
  });

  it('rejects negative version', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, version: -1 }))
      .toThrow('"version" must be a non-negative number');
  });

  it('rejects invalid bucket name format', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, bucket_name: 'BAD' }))
      .toThrow('Invalid bucket name');
  });

  it('rejects non-array non-null checksums', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, checksums: 'bad' }))
      .toThrow('"checksums" must be an array or null');
  });

  it('normalizes null checksums to empty array', () => {
    const result = validateEventPayload({ ...validCreatePayload, checksums: null });
    expect(result.checksums).toEqual([]);
  });

  it('normalizes undefined checksums to empty array', () => {
    const { checksums: _, ...withoutChecksums } = validCreatePayload;
    const result = validateEventPayload(withoutChecksums);
    expect(result.checksums).toEqual([]);
  });

  it('preserves valid checksums array', () => {
    const result = validateEventPayload({ ...validCreatePayload, checksums: ['abc', 'def'] });
    expect(result.checksums).toEqual(['abc', 'def']);
  });

  it('rejects object_name with control characters', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, object_name: 'file\0.bin' }))
      .toThrow('control characters');
  });

  it('rejects object_name exceeding max length', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, object_name: 'a'.repeat(1025) }))
      .toThrow('too long');
  });

  it('rejects checksums array with numeric elements', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, checksums: [123] }))
      .toThrow('"checksums[0]" must be a string');
  });

  it('rejects checksums array with null element', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, checksums: [null] }))
      .toThrow('"checksums[0]" must be a string');
  });

  it('rejects checksums array with mixed valid and invalid elements', () => {
    expect(() => validateEventPayload({ ...validCreatePayload, checksums: ['abc', 42] }))
      .toThrow('"checksums[1]" must be a string');
  });
});
