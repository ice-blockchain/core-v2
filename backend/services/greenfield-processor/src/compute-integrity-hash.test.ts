import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeIntegrityHash, verifyIntegrityHash } from './compute-integrity-hash.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'integrity-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

function expectedIntegrityHash(data: Buffer, segmentSize: number): string {
  const hashes: Buffer[] = [];
  for (let offset = 0; offset < data.length; offset += segmentSize) {
    const segment = data.subarray(offset, offset + segmentSize);
    hashes.push(sha256(segment));
  }
  return sha256(Buffer.concat(hashes)).toString('hex');
}

describe('computeIntegrityHash', () => {
  it('computes hash for a single-segment file', async () => {
    const data = Buffer.from('hello greenfield');
    const filePath = join(tempDir, 'single.bin');
    await writeFile(filePath, data);

    const hash = await computeIntegrityHash(filePath, 1024);
    const expected = expectedIntegrityHash(data, 1024);

    expect(hash).toBe(expected);
  });

  it('computes hash for a multi-segment file', async () => {
    const segmentSize = 64;
    const data = Buffer.alloc(segmentSize * 3, 0);
    data.fill(0xaa, 0, segmentSize);
    data.fill(0xbb, segmentSize, segmentSize * 2);
    data.fill(0xcc, segmentSize * 2, segmentSize * 3);
    const filePath = join(tempDir, 'multi.bin');
    await writeFile(filePath, data);

    const hash = await computeIntegrityHash(filePath, segmentSize);
    const expected = expectedIntegrityHash(data, segmentSize);

    expect(hash).toBe(expected);
  });

  it('handles file size exactly equal to segment size', async () => {
    const segmentSize = 128;
    const data = Buffer.alloc(segmentSize, 0xff);
    const filePath = join(tempDir, 'exact.bin');
    await writeFile(filePath, data);

    const hash = await computeIntegrityHash(filePath, segmentSize);
    const expected = expectedIntegrityHash(data, segmentSize);

    expect(hash).toBe(expected);
  });

  it('handles file size not aligned to segment boundary', async () => {
    const segmentSize = 64;
    const data = Buffer.alloc(100, 0xdd);
    const filePath = join(tempDir, 'unaligned.bin');
    await writeFile(filePath, data);

    const hash = await computeIntegrityHash(filePath, segmentSize);
    const expected = expectedIntegrityHash(data, segmentSize);

    expect(hash).toBe(expected);
  });

  it('uses custom small segment size for testing', async () => {
    const segmentSize = 16;
    const data = Buffer.alloc(48, 0x42);
    const filePath = join(tempDir, 'small-seg.bin');
    await writeFile(filePath, data);

    const hash = await computeIntegrityHash(filePath, segmentSize);
    const expected = expectedIntegrityHash(data, segmentSize);

    expect(hash).toBe(expected);
  });

  it('throws on non-existent file', async () => {
    await expect(computeIntegrityHash(join(tempDir, 'missing.bin'), 64))
      .rejects.toThrow();
  });
});

describe('verifyIntegrityHash', () => {
  it('passes when hash matches', async () => {
    const data = Buffer.from('verified content');
    const filePath = join(tempDir, 'good.bin');
    await writeFile(filePath, data);
    const expected = expectedIntegrityHash(data, 64);

    await expect(verifyIntegrityHash(filePath, expected, 64))
      .resolves.toBeUndefined();
  });

  it('passes with uppercase expected hash', async () => {
    const data = Buffer.from('case test');
    const filePath = join(tempDir, 'case.bin');
    await writeFile(filePath, data);
    const expected = expectedIntegrityHash(data, 64).toUpperCase();

    await expect(verifyIntegrityHash(filePath, expected, 64))
      .resolves.toBeUndefined();
  });

  it('throws on hash mismatch', async () => {
    const data = Buffer.from('tampered');
    const filePath = join(tempDir, 'bad.bin');
    await writeFile(filePath, data);

    await expect(verifyIntegrityHash(filePath, 'deadbeef'.repeat(8), 64))
      .rejects.toThrow('Integrity hash mismatch');
  });

  it('deletes file on hash mismatch', async () => {
    const data = Buffer.from('delete me');
    const filePath = join(tempDir, 'to-delete.bin');
    await writeFile(filePath, data);

    await expect(verifyIntegrityHash(filePath, 'deadbeef'.repeat(8), 64))
      .rejects.toThrow();

    await expect(stat(filePath)).rejects.toThrow();
  });

  it('throws cleanly on missing file', async () => {
    await expect(verifyIntegrityHash(join(tempDir, 'gone.bin'), 'abc', 64))
      .rejects.toThrow();
  });

  it('produces deterministic results across calls', async () => {
    const data = Buffer.alloc(200, 0xfe);
    const filePath = join(tempDir, 'deterministic.bin');
    await writeFile(filePath, data);

    const hash1 = await computeIntegrityHash(filePath, 64);
    const hash2 = await computeIntegrityHash(filePath, 64);

    expect(hash1).toBe(hash2);
  });
});
