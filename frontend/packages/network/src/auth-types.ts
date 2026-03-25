import type { NetworkEventEmitter } from './event-types';

export interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface BearerAuthInterceptorConfig {
  tokenStorage: TokenStorage;
  refreshEndpoint: string;
  refreshFn: (refreshToken: string) => Promise<RefreshResult>;
  eventEmitter: NetworkEventEmitter;
}
