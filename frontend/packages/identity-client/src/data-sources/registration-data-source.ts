import type { HttpClient } from '@ion/network';
import type { UserRegistrationChallenge, RegistrationResult } from '../types';
import { validateRegistrationChallengeResponse, validateRegistrationResultResponse } from './validate-response';

export interface RegistrationDataSource {
  initRegistration(email: string, earlyAccessEmail?: string): Promise<UserRegistrationChallenge>;
  completeRegistration(
    credential: RegistrationCredentialPayload,
    tempToken: string,
    earlyAccessEmail?: string,
  ): Promise<RegistrationResult>;
}

export interface RegistrationCredentialPayload {
  firstFactorCredential: {
    credentialKind: 'Fido2' | 'PasswordProtectedKey';
    credentialInfo: Record<string, unknown>;
    encryptedPrivateKey?: string;
  };
}

export function createRegistrationDataSource(httpClient: HttpClient): RegistrationDataSource {
  return {
    async initRegistration(email, earlyAccessEmail) {
      const { body } = await httpClient.post<UserRegistrationChallenge>('/auth/registration/delegated', {
        body: { email, ...(earlyAccessEmail != null && { earlyAccessEmail }) },
      });
      validateRegistrationChallengeResponse(body);
      return body!;
    },

    async completeRegistration(credential, tempToken, earlyAccessEmail) {
      const { body } = await httpClient.post<RegistrationResult>('/auth/registration/enduser', {
        body: { ...credential, ...(earlyAccessEmail != null && { earlyAccessEmail }) },
        headers: { Authorization: `Bearer ${tempToken}` },
      });
      validateRegistrationResultResponse(body);
      return body!;
    },
  };
}
