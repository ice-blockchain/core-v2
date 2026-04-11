import type { HttpClient } from '@ion/network';

import type { UserActionChallenge } from '../types';

import { validateActionChallengeResponse, validateUserActionResponse } from './validate-response';

interface InitActionInput {
  userActionPayload: string;
  userActionHttpMethod: string;
  userActionHttpPath: string;
  userActionServerKind: string;
}

interface CompleteActionInput {
  challengeIdentifier: string;
  firstFactor: {
    kind: 'Fido2' | 'PasswordProtectedKey';
    credentialAssertion: {
      clientData: string;
      credId: string;
      signature: string;
      authenticatorData?: string | null;
      userHandle?: string | null;
    };
  };
}

export interface UserActionDataSource {
  initAction(input: InitActionInput, username: string): Promise<UserActionChallenge>;
  completeAction(input: CompleteActionInput, username: string): Promise<{ userAction: string }>;
}

export function createUserActionDataSource(httpClient: HttpClient): UserActionDataSource {
  return {
    async initAction(input, username) {
      const { body } = await httpClient.post<UserActionChallenge>('/auth/action/init', {
        body: input,
        headers: { 'X-Username': username },
      });
      validateActionChallengeResponse(body);
      return body!;
    },

    async completeAction(input, username) {
      const { body } = await httpClient.post<{ userAction: string }>('/auth/action', {
        body: input,
        headers: { 'X-Username': username },
      });
      validateUserActionResponse(body);
      return body!;
    },
  };
}
