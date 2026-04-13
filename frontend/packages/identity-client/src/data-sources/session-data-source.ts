import type { HttpClient } from '@ion/network';
import { validateRefreshTokenResponse } from './validate-response';

export interface RefreshTokenInput {
  username: string;
  currentToken: string;
  refreshToken: string;
}

export interface SessionDataSource {
  refreshToken(input: RefreshTokenInput): Promise<{ token: string; refreshToken?: string }>;
  logout(username: string): Promise<void>;
}

export function createSessionDataSource(httpClient: HttpClient): SessionDataSource {
  return {
    async refreshToken(input) {
      const { body } = await httpClient.post<{ token: string; refreshToken?: string }>('/auth/login/delegated', {
        body: { username: input.username, refreshToken: input.refreshToken },
        headers: { Authorization: `Bearer ${input.currentToken}`, 'X-Username': input.username },
      });
      validateRefreshTokenResponse(body);
      return body;
    },

    async logout(username) {
      await httpClient.put<void>('/auth/logout', {
        headers: { 'X-Username': username },
      });
    },
  };
}
