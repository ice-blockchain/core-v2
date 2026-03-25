import type { HttpClient } from '@ion/network';
import type { UserActionChallenge, AuthTokens } from '../types';

export interface LoginDataSource {
  initLogin(username: string): Promise<UserActionChallenge>;
  completeLogin(payload: LoginPayload): Promise<AuthTokens>;
}

export interface LoginPayload {
  challengeIdentifier: string;
  firstFactor: {
    kind: 'Fido2' | 'PasswordProtectedKey';
    credentialAssertion: Record<string, unknown>;
  };
}

export function createLoginDataSource(httpClient: HttpClient): LoginDataSource {
  return {
    initLogin(username) {
      return httpClient.post<UserActionChallenge>('/auth/login/init', {
        body: { username },
      });
    },

    completeLogin(payload) {
      return httpClient.post<AuthTokens>('/auth/login', {
        body: payload,
      });
    },
  };
}
