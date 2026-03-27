import type { HttpClient } from '@ion/network';
import type { UserActionChallenge, AuthTokens } from '../types';
import { validateActionChallengeResponse, validateAuthTokensResponse } from './validate-response';

export interface LoginDataSource {
  initLogin(username: string, twoFAVerificationCodes?: Record<string, string>): Promise<UserActionChallenge>;
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
    async initLogin(username, twoFAVerificationCodes) {
      const response = await httpClient.post<UserActionChallenge>('/auth/login/init', {
        body: { username, '2FAVerificationCodes': twoFAVerificationCodes ?? {} },
      });
      validateActionChallengeResponse(response);
      return response;
    },

    async completeLogin(payload) {
      const response = await httpClient.post<AuthTokens>('/auth/login', {
        body: payload,
      });
      validateAuthTokensResponse(response);
      return response;
    },
  };
}
