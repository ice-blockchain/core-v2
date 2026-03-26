import type { GreenfieldClient, GreenfieldUploadParams } from "./types";

export async function greenfieldUpload(
  client: GreenfieldClient,
  params: GreenfieldUploadParams,
): Promise<void> {
  if (params.signal.aborted) {
    throw new Error("Upload cancelled");
  }

  const response = await fetch(params.uri);
  const blob = await response.blob();

  await client.object.delegateUploadObject(
    {
      bucketName: params.bucketName,
      objectName: params.objectName,
      body: blob as unknown as File,
    },
    {
      type: params.auth.type,
      domain: params.auth.domain,
      seed: params.auth.seedString,
      address: params.auth.address,
    },
  );
}
