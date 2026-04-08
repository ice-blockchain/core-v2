import { createHash } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';

const DEFAULT_SEGMENT_SIZE = 16 * 1024 * 1024;

export async function computeIntegrityHash(
  filePath: string,
  segmentSize: number = DEFAULT_SEGMENT_SIZE,
): Promise<string> {
  const segmentHashes: Buffer[] = [];
  const handle = await open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(segmentSize);
    let bytesRead: number;

    do {
      const result = await handle.read(buffer, 0, segmentSize);
      bytesRead = result.bytesRead;
      if (bytesRead > 0) {
        const hash = createHash('sha256')
          .update(buffer.subarray(0, bytesRead))
          .digest();
        segmentHashes.push(hash);
      }
    } while (bytesRead === segmentSize);
  } finally {
    await handle.close();
  }

  const concatenated = Buffer.concat(segmentHashes);
  return createHash('sha256').update(concatenated).digest('hex');
}

export async function verifyIntegrityHash(
  filePath: string,
  expectedHash: string,
  segmentSize: number = DEFAULT_SEGMENT_SIZE,
): Promise<void> {
  const actual = await computeIntegrityHash(filePath, segmentSize);
  const expected = normalizeToHex(expectedHash);

  if (actual !== expected) {
    await unlink(filePath).catch(() => {});
    throw new Error(
      `Integrity hash mismatch: expected ${expected}, got ${actual}`,
    );
  }
}

function normalizeToHex(hash: string): string {
  const lower = hash.toLowerCase();
  if (/^[0-9a-f]{64}$/.test(lower)) return lower;

  const buf = Buffer.from(hash, 'base64');
  if (buf.length === 32) return buf.toString('hex');

  return lower;
}
