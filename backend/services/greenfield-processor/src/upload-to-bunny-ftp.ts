import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Client } from 'basic-ftp';
import type { FtpUploadDeps } from './types.js';

export default async function uploadToBunnyFtp(
  deps: FtpUploadDeps,
): Promise<void> {
  const { localFilePath, remotePath, ftpClient } = deps;
  const localSize = (await stat(localFilePath)).size;

  await ensureRemoteDirectory(ftpClient, remotePath);
  const remoteSize = await checkRemoteFileSize(ftpClient, remotePath);

  await executeUpload(ftpClient, localFilePath, remotePath, localSize, remoteSize);
  await verifyUploadSize(ftpClient, remotePath, localSize);
}

async function checkRemoteFileSize(
  client: Client,
  remotePath: string,
): Promise<number> {
  try {
    return await client.size(remotePath);
  } catch {
    return 0;
  }
}

async function executeUpload(
  client: Client,
  localFilePath: string,
  remotePath: string,
  localSize: number,
  remoteSize: number,
): Promise<void> {
  if (remoteSize === localSize) return;

  if (remoteSize > localSize) {
    await client.remove(remotePath).catch(() => {
      // best-effort: remove corrupt remote before re-upload
    });
    await client.uploadFrom(localFilePath, remotePath);
    return;
  }

  if (remoteSize > 0) {
    const stream = createReadStream(localFilePath, { start: remoteSize });
    try {
      await client.appendFrom(stream, remotePath);
    } finally {
      stream.destroy();
    }
    return;
  }

  await client.uploadFrom(localFilePath, remotePath);
}

async function ensureRemoteDirectory(
  client: Client,
  remotePath: string,
): Promise<void> {
  const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
  if (!dir) return;
  const home = await client.pwd();
  await client.ensureDir(dir);
  await client.cd(home);
}

async function verifyUploadSize(
  client: Client,
  remotePath: string,
  expectedSize: number,
): Promise<void> {
  const finalSize = await client.size(remotePath);
  if (finalSize !== expectedSize) {
    throw new Error(
      `Upload size mismatch: expected ${expectedSize}, got ${finalSize}`,
    );
  }
}
