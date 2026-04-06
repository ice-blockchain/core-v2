import { createDownloadQueueRepository } from './download-queue-repository';
import { cancellationRegistry } from './cancellation-registry';
import type { FileStorageDependencies } from './types';

export function createDownloadCanceller(deps: FileStorageDependencies) {
  const repository = createDownloadQueueRepository(deps.database);

  async function cancelDownload(downloadId: string): Promise<boolean> {
    const wasCancelled = cancellationRegistry.cancel(downloadId);
    if (!wasCancelled) return false;
    await repository.updateStatusIfNotTerminal(downloadId, 'cancelled');
    return true;
  }

  return { cancelDownload } as const;
}
