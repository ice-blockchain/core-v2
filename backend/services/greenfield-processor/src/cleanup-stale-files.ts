import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from 'pino';

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

interface CleanupDeps {
  tempDir: string;
  logger: Logger;
}

export default async function cleanupStaleFiles(
  deps: CleanupDeps,
): Promise<void> {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  await cleanupDirectory(deps.tempDir, cutoff, deps.logger);
}

async function cleanupDirectory(
  dir: string,
  cutoff: number,
  logger: Logger,
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await cleanupDirectory(fullPath, cutoff, logger);
      continue;
    }
    if (!entry.name.endsWith('.part')) continue;
    await removeIfStale(fullPath, cutoff, logger);
  }
}

async function removeIfStale(
  filePath: string,
  cutoff: number,
  logger: Logger,
): Promise<void> {
  try {
    const stats = await stat(filePath);
    if (stats.mtimeMs < cutoff) {
      await unlink(filePath);
      logger.info({ filePath }, 'removed stale part file');
    }
  } catch (err) {
    logger.debug({ err, filePath }, 'failed to clean stale file');
  }
}
