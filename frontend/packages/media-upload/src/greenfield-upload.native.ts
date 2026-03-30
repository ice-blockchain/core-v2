import type { GreenfieldClient, GreenfieldUploadParams } from "./types";
import { validateNativeUri } from "./validate-uri";

export async function greenfieldUpload(
  client: GreenfieldClient,
  params: GreenfieldUploadParams,
): Promise<void> {
  if (params.signal.aborted) {
    throw new Error("Upload cancelled");
  }

  validateNativeUri(params.uri);

  const { File: ExpoFile } = await import("expo-file-system");
  const file = new ExpoFile(params.uri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  await client.object.delegateUploadObject(
    {
      bucketName: params.bucketName,
      objectName: params.objectName,
      body: bytes,
      signal: params.signal,
    },
    {
      type: params.auth.type,
      domain: params.auth.domain,
      seed: params.auth.seedString,
      address: params.auth.address,
    },
  );
}
