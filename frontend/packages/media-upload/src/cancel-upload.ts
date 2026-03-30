import type { UploadDependencies } from "./types";
import { cancellationRegistry } from "./cancellation-registry";
import { createUploadQueueRepository } from "./upload-queue-repository";

export function createUploadCanceller(deps: UploadDependencies) {
  const repository = createUploadQueueRepository(deps.database);

  async function cancelUpload(uploadId: string): Promise<boolean> {
    const wasCancelled = cancellationRegistry.cancel(uploadId);
    if (!wasCancelled) return false;

    await repository.updateStatusIfNotTerminal(uploadId, "cancelled");
    return true;
  }

  return { cancelUpload } as const;
}
