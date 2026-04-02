import type { ISecureStorage } from '@ion/storage';
import type { AuthTokens } from '../types';
import { parseJwtExpiry } from './parse-jwt-expiry';

const EXPIRY_BUFFER_SECONDS = 30;
const TRACKED_USERS_KEY = 'ion_identity_tracked_users';

export interface TokenManager {
  getTokens(username: string): Promise<AuthTokens | null>;
  setTokens(username: string, tokens: AuthTokens): Promise<void>;
  clearTokens(username: string): Promise<void>;
  isTokenExpired(username: string): Promise<boolean>;
  getTrackedUsers(): Promise<readonly string[]>;
}

function storageKey(username: string): string {
  return `ion_identity_tokens:${username}`;
}

function isAuthTokens(value: unknown): value is AuthTokens {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.token === 'string' && obj.token.length > 0 &&
    typeof obj.refreshToken === 'string' && obj.refreshToken.length > 0;
}

function readTokens(secureStorage: ISecureStorage, username: string): Promise<AuthTokens | null> {
  return secureStorage.getItem(storageKey(username)).then((raw) => {
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isAuthTokens(parsed) ? parsed : null;
    } catch { return null; }
  });
}

async function readTrackedUsers(secureStorage: ISecureStorage): Promise<string[]> {
  const raw = await secureStorage.getItem(TRACKED_USERS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch { return []; }
}

async function writeTrackedUsers(secureStorage: ISecureStorage, usernames: string[]): Promise<void> {
  await secureStorage.setItem(TRACKED_USERS_KEY, JSON.stringify(usernames));
}

export function createTokenManager(secureStorage: ISecureStorage): TokenManager {
  let mutationLock: Promise<void> = Promise.resolve();

  function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = mutationLock.then(fn, fn);
    mutationLock = next.then(() => {}, () => {});
    return next;
  }

  return {
    getTokens: (username) => readTokens(secureStorage, username),

    setTokens: (username, tokens) => withLock(async () => {
      await secureStorage.setItem(storageKey(username), JSON.stringify(tokens));
      const tracked = await readTrackedUsers(secureStorage);
      if (!tracked.includes(username)) {
        await writeTrackedUsers(secureStorage, [...tracked, username]);
      }
    }),

    clearTokens: (username) => withLock(async () => {
      await secureStorage.removeItem(storageKey(username));
      const tracked = await readTrackedUsers(secureStorage);
      await writeTrackedUsers(secureStorage, tracked.filter((u) => u !== username));
    }),

    async isTokenExpired(username) {
      const tokens = await readTokens(secureStorage, username);
      if (!tokens) return true;
      const exp = parseJwtExpiry(tokens.token);
      if (!exp) return true;
      return Date.now() >= (exp - EXPIRY_BUFFER_SECONDS) * 1000;
    },

    getTrackedUsers: () => readTrackedUsers(secureStorage),
  };
}
