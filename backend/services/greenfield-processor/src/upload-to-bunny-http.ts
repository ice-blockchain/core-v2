import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import AppError from './app-error.js';
import type { CdnUploaderConfig } from './types.js';

interface HttpUploadDeps {
  localFilePath: string;
  cdnPath: string;
  config: CdnUploaderConfig;
}

export default async function uploadToBunnyHttp(
  deps: HttpUploadDeps,
): Promise<void> {
  const { localFilePath, cdnPath, config } = deps;
  const fileSize = (await stat(localFilePath)).size;
  const body = Readable.toWeb(createReadStream(localFilePath));

  const regionPrefix = config.bunnyStorageRegion === 'ny'
    ? ''
    : `${config.bunnyStorageRegion}.`;

  const encodedPath = cdnPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://${regionPrefix}storage.bunnycdn.com/${config.bunnyStorageZone}/${encodedPath}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: config.bunnyStoragePassword,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(fileSize),
    },
    body: body as ReadableStream,
    signal: AbortSignal.timeout(120_000),
    duplex: 'half',
  } as RequestInit);

  if (!response.ok) {
    throw new AppError(
      `Bunny HTTP upload failed: ${response.status} ${response.statusText}`, 502,
    );
  }
}
