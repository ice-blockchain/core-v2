import type { HttpClient } from '@ion/network';
import type { UserRegistrationChallenge, RecoveryResult } from '../types';
import { validateRegistrationChallengeResponse, validateRecoveryResultResponse } from './validate-response';

interface InitRecoveryInput {
  username: string;
  credentialId: string;
  '2FAVerificationCodes'?: Record<string, string> | undefined;
}

interface CompleteRecoveryInput {
  newCredentials: {
    firstFactorCredential: {
      credentialKind: 'Fido2' | 'PasswordProtectedKey';
      credentialInfo: {
        credId: string;
        clientData: string;
        attestationData: string;
      };
      encryptedPrivateKey?: string | null;
    };
  };
  recovery: {
    kind: 'RecoveryKey';
    credentialAssertion: {
      clientData: string;
      credId: string;
      signature: string;
    };
  };
}

export interface RecoveryDataSource {
  initRecovery(input: InitRecoveryInput): Promise<UserRegistrationChallenge>;
  completeRecovery(input: CompleteRecoveryInput, temporaryToken: string): Promise<RecoveryResult>;
}

export function createRecoveryDataSource(httpClient: HttpClient): RecoveryDataSource {
  return {
    async initRecovery(input) {
      const { body } = await httpClient.post<UserRegistrationChallenge>(
        '/auth/recover/user/delegated',
        { body: input },
      );
      validateRegistrationChallengeResponse(body);
      return body!;
    },

    async completeRecovery(input, temporaryToken) {
      const { body } = await httpClient.post<RecoveryResult>(
        '/auth/recover/user',
        {
          body: input,
          headers: { Authorization: `Bearer ${temporaryToken}` },
        },
      );
      validateRecoveryResultResponse(body);
      return body!;
    },
  };
}
