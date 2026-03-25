import type { ISecureStorage } from '@ion/storage';
import type { AuthTokens } from '../types';
import { parseJwtExpiry } from './parse-jwt-expiry';

export interface TokenManager {
  getTokens(username: string): Promise<AuthTokens | null>;
  setTokens(username: string, tokens: AuthTokens): Promise<void>;
  clearTokens(username: string): Promise<void>;
  isTokenExpired(username: string): Promise<boolean>;
}

function tokenKey(username: string): string {
  return `ion_identity_token:${username}`;
}

function refreshKey(username: string): string {
  return `ion_identity_refresh:${username}`;
}

export function createTokenManager(secureStorage: ISecureStorage): TokenManager {
  return {
    async getTokens(username) {
      const token = await secureStorage.getItem(tokenKey(username));
      const refreshToken = await secureStorage.getItem(refreshKey(username));
      if (!token || !refreshToken) return null;
      return { token, refreshToken };
    },

    async setTokens(username, tokens) {
      await secureStorage.setItem(tokenKey(username), tokens.token);
      await secureStorage.setItem(refreshKey(username), tokens.refreshToken);
    },

    async clearTokens(username) {
      await secureStorage.removeItem(tokenKey(username));
      await secureStorage.removeItem(refreshKey(username));
    },

    async isTokenExpired(username) {
      const token = await secureStorage.getItem(tokenKey(username));
      if (!token) return true;
      const exp = parseJwtExpiry(token);
      if (!exp) return true;
      return Date.now() >= exp * 1000;
    },
  };
}
