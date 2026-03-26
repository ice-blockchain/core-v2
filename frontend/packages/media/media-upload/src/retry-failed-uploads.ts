import { Logger } from "@ion/diagnostics";
import type { UploadDependencies, UploadResult, UploadQueueRecord } from "./types";
import { cancellationRegistry } from "./cancellation-registry";
import { createUploadQueueRepository } from "./upload-queue-repository";
import { requestDelegation } from "./request-delegation";
import { greenfieldUpload } from "./greenfield-upload";

const MAX_RETRIES = 5;

async function ensureDelegation(
  deps: UploadDependencies,
  repository: ReturnType<typeof createUploadQueueRepository>,
  item: UploadQueueRecord,
) {
  if (item.bucket_name && item.object_name) {
    return { bucketName: item.bucket_name, objectName: item.object_name };
  }

  const delegation = await requestDelegation(
    deps.httpClient, deps.apiBaseUrl,
    { mimeType: item.mime_type, fileSize: item.file_size },
  );

  await repository.updateDelegation(
    item.upload_id, delegation.bucketName, delegation.objectName,
  );
  return delegation;
}

async function buildRetryAuth(deps: UploadDependencies, item: UploadQueueRecord) {
  const delegation = await requestDelegation(
    deps.httpClient, deps.apiBaseUrl,
    { mimeType: item.mime_type, fileSize: item.file_size },
  );
  return {
    type: delegation.authType,
    domain: delegation.domain,
    seedString: delegation.seedString,
    address: delegation.address,
  };
}

async function retryItem(
  deps: UploadDependencies,
  repository: ReturnType<typeof createUploadQueueRepository>,
  item: UploadQueueRecord,
): Promise<UploadResult> {
  const controller = cancellationRegistry.register(item.upload_id);
  const delegation = await ensureDelegation(deps, repository, item);
  const auth = await buildRetryAuth(deps, item);

  await repository.updateStatus(item.upload_id, "uploading");
  await greenfieldUpload(deps.greenfieldClient, {
    bucketName: delegation.bucketName, objectName: delegation.objectName,
    uri: item.uri, mimeType: item.mime_type,
    auth, signal: controller.signal,
  });

  await repository.updateCompletion(item.upload_id);
  cancellationRegistry.remove(item.upload_id);
  return { objectName: delegation.objectName, bucketName: delegation.bucketName, fileSize: item.file_size };
}

export function createUploadRetrier(deps: UploadDependencies) {
  const repository = createUploadQueueRepository(deps.database);

  async function retryFailedUploads(): Promise<UploadResult[]> {
    const failedItems = await repository.getItemsByStatus("failed");
    const results: UploadResult[] = [];

    for (const item of failedItems) {
      if (item.retry_count >= MAX_RETRIES) continue;

      try {
        const result = await retryItem(deps, repository, item);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await repository.updateFailure(item.upload_id, message);
        Logger.error("Retry failed", {
          data: { uploadId: item.upload_id, error: message },
        });
      }
    }

    return results;
  }

  return { retryFailedUploads } as const;
}
