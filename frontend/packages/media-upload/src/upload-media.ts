import { Logger } from "@ion/diagnostics";
import type {
  UploadDependencies,
  UploadInput,
  UploadResult,
  UploadProgressCallback,
  UploadStatus,
} from "./types";
import { generateUploadId } from "./generate-upload-id";
import { cancellationRegistry } from "./cancellation-registry";
import { createUploadQueueRepository } from "./upload-queue-repository";
import { requestDelegation } from "./request-delegation";
import { greenfieldUpload } from "./greenfield-upload";
import { validateUploadInput } from "./validate-upload-input";

interface UploadContext {
  deps: UploadDependencies;
  repository: ReturnType<typeof createUploadQueueRepository>;
  uploadId: string;
  input: UploadInput;
  signal: AbortSignal;
  onProgress?: UploadProgressCallback | undefined;
}

function emitProgress(
  context: UploadContext,
  status: UploadStatus,
): void {
  context.onProgress?.({
    uploadId: context.uploadId,
    status,
    bytesUploaded: status === "completed" ? context.input.fileSize : 0,
    totalBytes: context.input.fileSize,
  });
}

async function fetchDelegation(context: UploadContext) {
  await context.repository.updateStatus(context.uploadId, "requesting-delegation");
  emitProgress(context, "requesting-delegation");

  const delegation = await requestDelegation(
    context.deps.httpClient, context.deps.apiBaseUrl,
    { mimeType: context.input.mimeType, fileSize: context.input.fileSize },
  );

  await context.repository.updateDelegation(
    context.uploadId, delegation.bucketName, delegation.objectName,
  );
  return delegation;
}

async function performGreenfieldUpload(context: UploadContext) {
  const delegation = await fetchDelegation(context);
  await context.repository.updateStatus(context.uploadId, "uploading");
  emitProgress(context, "uploading");

  await greenfieldUpload(context.deps.greenfieldClient, {
    bucketName: delegation.bucketName,
    objectName: delegation.objectName,
    uri: context.input.uri,
    mimeType: context.input.mimeType,
    auth: {
      type: delegation.authType,
      domain: delegation.domain,
      seedString: delegation.seedString,
      address: delegation.address,
    },
    signal: context.signal,
  });

  return delegation;
}

async function executeUpload(context: UploadContext): Promise<UploadResult> {
  const delegation = await performGreenfieldUpload(context);

  await context.repository.updateCompletion(context.uploadId);
  cancellationRegistry.remove(context.uploadId);
  emitProgress(context, "completed");

  return {
    objectName: delegation.objectName,
    bucketName: delegation.bucketName,
    fileSize: context.input.fileSize,
  };
}

async function handleUploadError(
  context: UploadContext,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Upload cancelled") {
    await context.repository.updateStatus(context.uploadId, "cancelled");
  } else {
    await context.repository.updateFailure(context.uploadId, message);
  }

  cancellationRegistry.remove(context.uploadId);
  Logger.error("Media upload failed", {
    data: { uploadId: context.uploadId, error: message },
  });
}

export function createMediaUploader(deps: UploadDependencies) {
  const repository = createUploadQueueRepository(deps.database);

  async function uploadMedia(
    input: UploadInput,
    onProgress?: UploadProgressCallback,
  ): Promise<UploadResult> {
    validateUploadInput(input);

    const uploadId = generateUploadId();
    const controller = cancellationRegistry.register(uploadId);
    const now = Date.now();

    await repository.insertItem({
      upload_id: uploadId, uri: input.uri, mime_type: input.mimeType,
      file_size: input.fileSize, status: "queued", bytes_uploaded: 0,
      retry_count: 0, created_at: now, updated_at: now,
    });

    const context: UploadContext = {
      deps, repository, uploadId, input, signal: controller.signal, onProgress,
    };

    try {
      return await executeUpload(context);
    } catch (error) {
      await handleUploadError(context, error);
      throw error;
    }
  }

  return { uploadMedia } as const;
}
