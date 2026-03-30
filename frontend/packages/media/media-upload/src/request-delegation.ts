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
  const response = await httpClient.post<DelegationResponse>(
    `${apiBaseUrl}/uploads/delegate`,
    { body: { mimeType: input.mimeType, fileSize: input.fileSize } },
  );

  return response;
}
