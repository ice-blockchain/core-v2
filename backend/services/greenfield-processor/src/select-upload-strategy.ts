import { stat } from 'node:fs/promises';
import type { Client as FtpClient } from 'basic-ftp';
import uploadToBunnyFtp from './upload-to-bunny-ftp.js';
import uploadToBunnyHttp from './upload-to-bunny-http.js';
import type { CdnUploaderConfig } from './types.js';

interface UploadStrategyDeps {
  localFilePath: string;
  cdnPath: string;
  config: CdnUploaderConfig;
  ftpClient: FtpClient;
}

export default async function selectAndUpload(
  deps: UploadStrategyDeps,
): Promise<'http' | 'ftp'> {
  const { localFilePath, cdnPath, config, ftpClient } = deps;
  const fileSize = (await stat(localFilePath)).size;

  if (fileSize < config.httpUploadSizeLimit) {
    await uploadToBunnyHttp({ localFilePath, cdnPath, config });
    return 'http';
  }

  const remotePath = cdnPath;
  await uploadToBunnyFtp({ localFilePath, remotePath, ftpClient });
  return 'ftp';
}
