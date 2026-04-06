import { createDownloadQueueRepository } from './download-queue-repository';
import type { FileStorageDependencies, DownloadProgress, DownloadQueueRecord } from './types';

export function createDownloadQueueInspector(deps: FileStorageDependencies) {
  const repository = createDownloadQueueRepository(deps.database);

  async function getDownloadQueue(): Promise<DownloadProgress[]> {
    const records = await repository.getAllItems();
    return records.map(mapRecordToProgress);
  }

  return { getDownloadQueue } as const;
}

function mapRecordToProgress(record: DownloadQueueRecord): DownloadProgress {
  return {
    downloadId: record.download_id,
    fileId: record.file_id,
    status: record.status,
    bytesDownloaded: record.bytes_downloaded,
    totalBytes: record.file_size,
  };
}
