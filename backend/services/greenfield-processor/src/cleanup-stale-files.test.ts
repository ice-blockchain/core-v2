import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, stat, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pino from 'pino';
import cleanupStaleFiles from './cleanup-stale-files.js';

const logger = pino({ level: 'silent' });
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'cleanup-test-'));
});

async function createFileWithAge(
  filePath: string,
  ageMs: number,
): Promise<void> {
  await mkdir(join(filePath, '..'), { recursive: true }).catch(() => {});
  await writeFile(filePath, 'data');
  const past = new Date(Date.now() - ageMs);
  await utimes(filePath, past, past);
}

describe('cleanupStaleFiles', () => {
  it('removes .part files older than threshold', async () => {
    const partFile = join(tempDir, 'bucket', 'file.part');
    await createFileWithAge(partFile, 60 * 60 * 1000);

    await cleanupStaleFiles({ tempDir, logger });

    await expect(stat(partFile)).rejects.toThrow();
  });

  it('preserves .part files newer than threshold', async () => {
    const partFile = join(tempDir, 'bucket', 'recent.part');
    await mkdir(join(tempDir, 'bucket'), { recursive: true });
    await writeFile(partFile, 'data');

    await cleanupStaleFiles({ tempDir, logger });

    const stats = await stat(partFile);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('ignores non-.part files regardless of age', async () => {
    const binFile = join(tempDir, 'old.bin');
    await createFileWithAge(binFile, 60 * 60 * 1000);

    await cleanupStaleFiles({ tempDir, logger });

    const stats = await stat(binFile);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('handles nonexistent temp directory gracefully', async () => {
    await expect(
      cleanupStaleFiles({ tempDir: '/nonexistent/path', logger }),
    ).resolves.not.toThrow();
  });
});
