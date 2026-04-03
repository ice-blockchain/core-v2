import type { CredentialsDataSource } from '../data-sources/credentials-data-source';

interface ListCredentialsDeps {
  credentialsDataSource: CredentialsDataSource;
}

export async function listCredentials(
  username: string,
  deps: ListCredentialsDeps,
): Promise<Array<{ uuid: string | null; kind: string; name: string }>> {
  const response = await deps.credentialsDataSource.listCredentials(username);
  return response.items;
}
