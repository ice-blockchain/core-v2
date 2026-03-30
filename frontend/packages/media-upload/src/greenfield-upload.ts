import type { GreenfieldClient, GreenfieldUploadParams } from "./types";
import { validateWebUri } from "./validate-uri";

export async function greenfieldUpload(
  client: GreenfieldClient,
  params: GreenfieldUploadParams,
): Promise<void> {
  if (params.signal.aborted) {
    throw new Error("Upload cancelled");
  }

  validateWebUri(params.uri);

  const response = await fetch(params.uri, { signal: params.signal });
  const blob = await response.blob();

  await client.object.delegateUploadObject(
    {
      bucketName: params.bucketName,
      objectName: params.objectName,
      body: blob as unknown as File,
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
