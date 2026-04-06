import type { HttpClient } from '@ion/network';
import type { FileResolution } from './types';

export async function resolveFile(httpClient: HttpClient, apiBaseUrl: string, fileId: string): Promise<FileResolution> {
  const response = await httpClient.get<FileResolution>(`${apiBaseUrl}/files/${encodeURIComponent(fileId)}/resolve`);
  return response.body;
}
