import type { HttpClient } from '@ion/network';

export interface SessionDataSource {
  refreshToken(username: string, currentToken: string, refreshToken: string): Promise<{ token: string }>;
  logout(token: string, username: string): Promise<void>;
}

export function createSessionDataSource(httpClient: HttpClient): SessionDataSource {
  return {
    refreshToken(username, currentToken, refreshToken) {
      return httpClient.post<{ token: string }>('/auth/login/delegated', {
        body: { username, refreshToken },
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    },

    async logout(token, username) {
      await httpClient.put<void>('/auth/logout', {
        headers: { Authorization: `Bearer ${token}`, 'X-Username': username },
      });
    },
  };
}
