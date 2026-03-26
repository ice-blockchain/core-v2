import type { ISecureStorage } from '@ion/storage';
import type { AuthTokens } from '../types';
import { parseJwtExpiry } from './parse-jwt-expiry';

export interface TokenManager {
  getTokens(username: string): Promise<AuthTokens | null>;
  setTokens(username: string, tokens: AuthTokens): Promise<void>;
  clearTokens(username: string): Promise<void>;
  isTokenExpired(username: string): Promise<boolean>;
}

function storageKey(username: string): string {
  return `ion_identity_tokens:${username}`;
}

function readTokens(secureStorage: ISecureStorage, username: string): Promise<AuthTokens | null> {
  return secureStorage.getItem(storageKey(username)).then((raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthTokens; }
    catch { return null; }
  });
}

export function createTokenManager(secureStorage: ISecureStorage): TokenManager {
  return {
    getTokens: (username) => readTokens(secureStorage, username),

    async setTokens(username, tokens) {
      await secureStorage.setItem(storageKey(username), JSON.stringify(tokens));
    },

    async clearTokens(username) {
      await secureStorage.removeItem(storageKey(username));
    },

    async isTokenExpired(username) {
      const tokens = await readTokens(secureStorage, username);
      if (!tokens) return true;
      const exp = parseJwtExpiry(tokens.token);
      if (!exp) return true;
      return Date.now() >= exp * 1000;
    },
  };
}
