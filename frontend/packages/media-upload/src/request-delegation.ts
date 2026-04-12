import type { HttpClient } from "@ion/network";
import type { DelegationResponse } from "./types";

interface DelegationInput {
  mimeType: string;
  fileSize: number;
}

export async function requestDelegation(
  httpClient: HttpClient,
  apiBaseUrl: string,
  input: DelegationInput,
): Promise<DelegationResponse> {
  const { body } = await httpClient.post<DelegationResponse>(
    `${apiBaseUrl}/uploads/delegate`,
    { body: { mimeType: input.mimeType, fileSize: input.fileSize } },
  );

  if (body === undefined) throw new Error('Empty response body from requestDelegation');
  return body;
}
