import type { UploadDependencies } from "./types";
import { cancellationRegistry } from "./cancellation-registry";
import { createUploadQueueRepository } from "./upload-queue-repository";

export function createUploadCanceller(deps: UploadDependencies) {
  const repository = createUploadQueueRepository(deps.database);

  async function cancelUpload(uploadId: string): Promise<boolean> {
    const wasCancelled = cancellationRegistry.cancel(uploadId);
    await repository.updateStatus(uploadId, "cancelled");
    return wasCancelled;
  }

  return { cancelUpload } as const;
}
