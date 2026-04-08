import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Response as UndiciResponse } from 'undici';
import createSizeLimiter from './create-size-limiter.js';
import fetchWithPinnedDns from './fetch-with-pinned-dns.js';
import type { PinnedFetchResult } from './fetch-with-pinned-dns.js';
import { verifyIntegrityHash } from './compute-integrity-hash.js';
import type { ValidatedEndpoint } from './validate-endpoint.js';
import type { DownloadDeps } from './types.js';
import { assertSafePath, assertValidBucketName } from './validate.js';

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export default async function downloadFromGreenfield(
  deps: DownloadDeps,
): Promise<string> {
  const { bucketName, objectName, payloadSize, spEndpoint, tempDir, maxDownloadSize, checksums, maxSegmentSize, validatedEndpoint, logger } = deps;

  assertValidBucketName(bucketName);

  if (payloadSize > maxDownloadSize) {
    throw new Error(
      `File too large: ${payloadSize} exceeds max ${maxDownloadSize}`,
    );
  }

  const partPath = assertSafePath(tempDir, `${bucketName}/${objectName}.part`);
  const finalPath = assertSafePath(tempDir, `${bucketName}/${objectName}`);
  await mkdir(dirname(partPath), { recursive: true });

  const url = buildSpUrl(spEndpoint, bucketName, objectName);

  const existingSize = await getFileSize(partPath);
  const fetchResult = await fetchWithRange(url, existingSize, validatedEndpoint);
  const { response, cleanup } = fetchResult;

  try {
    const writeMode = determineWriteMode(response.status, existingSize);

    if (writeMode === 'truncate' && existingSize > 0) {
      await unlink(partPath).catch((err) => {
        logger?.debug({ err, partPath }, 'failed to unlink stale part file');
      });
    }

    const startingBytes = writeMode === 'append' ? existingSize : 0;
    const remainingAllowance = maxDownloadSize - startingBytes;
    if (remainingAllowance <= 0) {
      await unlink(partPath).catch(() => {});
      throw new Error('Partial file already exceeds max download size');
    }

    await writeResponseToFile(response, { filePath: partPath, mode: writeMode, maxBytes: remainingAllowance });
  } finally {
    await cleanup();
  }
  await verifyDownloadSize(partPath, payloadSize);

  if (checksums.length > 0) {
    await verifyIntegrityHash(partPath, checksums[0], maxSegmentSize);
  }

  await rename(partPath, finalPath);
  return finalPath;
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function buildSpUrl(
  spEndpoint: string,
  bucketName: string,
  objectName: string,
): string {
  const parsed = new URL(spEndpoint);
  const encoded = encodeURIComponent(objectName);
  parsed.hostname = `${bucketName}.${parsed.hostname}`;
  parsed.pathname = `/${encoded}`;
  return parsed.toString();
}

async function fetchWithRange(
  url: string,
  offset: number,
  validatedEndpoint: ValidatedEndpoint,
): Promise<PinnedFetchResult> {
  const headers: Record<string, string> = {};
  if (offset > 0) {
    headers['Range'] = `bytes=${offset}-`;
  }

  const result = await fetchWithPinnedDns({
    url,
    init: {
      headers,
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      redirect: 'error',
    },
    validatedEndpoint,
  });

  if (!result.response.ok && result.response.status !== 206) {
    await result.cleanup();
    throw new Error(
      `Greenfield download failed: ${result.response.status} ${result.response.statusText}`,
    );
  }

  return result;
}

function determineWriteMode(
  status: number,
  existingSize: number,
): 'append' | 'truncate' {
  if (status === 206 && existingSize > 0) return 'append';
  return 'truncate';
}

interface WriteOpts {
  filePath: string;
  mode: 'append' | 'truncate';
  maxBytes: number;
}

async function writeResponseToFile(
  response: UndiciResponse,
  opts: WriteOpts,
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const flags = opts.mode === 'append' ? 'a' : 'w';
  const writeStream = createWriteStream(opts.filePath, { flags });
  const readable = Readable.fromWeb(response.body as never);
  const limiter = createSizeLimiter(opts.maxBytes);

  await pipeline(readable, limiter, writeStream);
}

async function verifyDownloadSize(
  filePath: string,
  expectedSize: number,
): Promise<void> {
  if (expectedSize <= 0) return;
  const actualSize = await getFileSize(filePath);
  if (actualSize !== expectedSize) {
    await unlink(filePath).catch(() => {
      // best-effort cleanup of mismatched download
    });
    throw new Error(
      `Download size mismatch: expected ${expectedSize}, got ${actualSize}`,
    );
  }
}
