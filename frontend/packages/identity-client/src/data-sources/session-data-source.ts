import type { HttpClient } from '@ion/network';

export interface RefreshTokenInput {
  username: string;
  currentToken: string;
  refreshToken: string;
}

export interface SessionDataSource {
  refreshToken(input: RefreshTokenInput): Promise<{ token: string; refreshToken?: string }>;
  logout(token: string, username: string): Promise<void>;
}

export function createSessionDataSource(httpClient: HttpClient): SessionDataSource {
  return {
    refreshToken(input) {
      return httpClient.post<{ token: string; refreshToken?: string }>('/auth/login/delegated', {
        body: { username: input.username, refreshToken: input.refreshToken },
        headers: { Authorization: `Bearer ${input.currentToken}` },
      });
    },

    async logout(token, username) {
      await httpClient.put<void>('/auth/logout', {
        headers: { Authorization: `Bearer ${token}`, 'X-Username': username },
      });
    },
  };
}
