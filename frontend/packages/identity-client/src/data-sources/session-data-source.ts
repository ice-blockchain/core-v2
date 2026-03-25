import type { HttpClient } from '@ion/network';

export interface SessionDataSource {
  refreshToken(currentToken: string, refreshToken: string): Promise<{ token: string }>;
  logout(token: string): Promise<void>;
}

export function createSessionDataSource(httpClient: HttpClient): SessionDataSource {
  return {
    refreshToken(currentToken, refreshToken) {
      return httpClient.post<{ token: string }>('/auth/login/delegated', {
        body: { refreshToken },
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    },

    async logout(token) {
      await httpClient.post<void>('/auth/logout', {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };
}
