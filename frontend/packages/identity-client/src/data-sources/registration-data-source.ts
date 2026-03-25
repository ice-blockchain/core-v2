import type { HttpClient } from '@ion/network';
import type { UserRegistrationChallenge, RegistrationResult } from '../types';

export interface RegistrationDataSource {
  initRegistration(email: string): Promise<UserRegistrationChallenge>;
  completeRegistration(
    credential: RegistrationCredentialPayload,
    tempToken: string,
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
    initRegistration(email) {
      return httpClient.post<UserRegistrationChallenge>('/auth/registration/delegated', {
        body: { email },
      });
    },

    completeRegistration(credential, tempToken) {
      return httpClient.post<RegistrationResult>('/auth/registration/enduser', {
        body: credential,
        headers: { Authorization: `Bearer ${tempToken}` },
      });
    },
  };
}
