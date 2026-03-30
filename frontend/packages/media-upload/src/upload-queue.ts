import type { UploadDependencies, UploadProgress, UploadQueueRecord } from "./types";
import { createUploadQueueRepository } from "./upload-queue-repository";

function mapRecordToProgress(record: UploadQueueRecord): UploadProgress {
  return {
    uploadId: record.upload_id,
    status: record.status,
    bytesUploaded: record.bytes_uploaded,
    totalBytes: record.file_size,
  };
}

export function createUploadQueueInspector(deps: UploadDependencies) {
  const repository = createUploadQueueRepository(deps.database);

  async function getUploadQueue(): Promise<UploadProgress[]> {
    const records = await repository.getAllItems();
    return records.map(mapRecordToProgress);
  }

  return { getUploadQueue } as const;
}
