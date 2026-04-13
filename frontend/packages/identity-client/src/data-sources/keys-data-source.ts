import type { HttpClient } from '@ion/network';

import type { ListKeysResponse } from '../keys/types';

export interface KeysDataSource {
  listKeys(
    username: string,
    query?: { owner?: string; limit?: number; paginationToken?: string },
  ): Promise<ListKeysResponse>;
}

export function createKeysDataSource(httpClient: HttpClient): KeysDataSource {
  return {
    async listKeys(username, params) {
      const query: Record<string, string> = {};
      if (params?.owner) query.owner = params.owner;
      if (params?.limit !== undefined) query.limit = String(params.limit);
      if (params?.paginationToken) query.paginationToken = params.paginationToken;
      const { body } = await httpClient.get<ListKeysResponse>('/keys', {
        query,
        headers: { 'X-Username': username },
      });
      return body;
    },
  };
}
